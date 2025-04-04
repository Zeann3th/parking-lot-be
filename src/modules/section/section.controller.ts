import { Body, Controller, Get, Patch, Post, Param, Delete, UseGuards, HttpCode, Query, ParseIntPipe, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { RolesGuard } from 'src/guards/role.guard';
import { Roles } from 'src/decorators/role.decorator';
import { User } from 'src/decorators/user.decorator';
import { UserInterface } from 'src/common/types';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionController {
  constructor(
    private readonly sectionService: SectionService,
    @InjectRedis() private readonly redis: Redis
  ) { }

  @ApiOperation({ summary: "Get all sections" })
  @ApiHeader({
    name: "Cache-Control",
    required: false,
    description: "no-cache to ignore cache"
  })
  @ApiResponse({ status: 200, description: "Return all sections" })
  @ApiResponse({ status: 403, description: "You are not allowed to view any sections" })
  @ApiBearerAuth()
  @Roles("ADMIN", "SECURITY")
  @Get()
  async getAll(
    @Headers("Cache-Control") cacheOption: string,
    @User() user: UserInterface
  ) {
    const key = `sections`;
    if (cacheOption && cacheOption !== "no-cache") {
      const cachedSections = await this.redis.get(key);
      if (cachedSections) {
        return JSON.parse(cachedSections);
      }
    }
    const sections = await this.sectionService.getAll(user);
    await this.redis.set(key, JSON.stringify(sections), "EX", 60 * 10);
    return sections;
  }

  @ApiOperation({ summary: "Get section by id" })
  @ApiHeader({
    name: "Cache-Control",
    required: false,
    description: "no-cache to ignore cache"
  })
  @ApiParam({ name: "id", description: "Section id" })
  @ApiResponse({ status: 200, description: "Return section" })
  @ApiResponse({ status: 403, description: "You are not allowed to view this section" })
  @ApiBearerAuth()
  @Roles("ADMIN", "SECURITY")
  @Get(":id")
  async getById(
    @Headers("Cache-Control") cacheOption: string,
    @User() user: UserInterface,
    @Param("id", ParseIntPipe) id: number
  ) {
    const key = `sections:${id}`;
    if (cacheOption && cacheOption !== "no-cache") {
      const cachedSection = await this.redis.get(key);
      if (cachedSection) {
        return JSON.parse(cachedSection);
      }
    }

    const section = await this.sectionService.getById(user, id);
    await this.redis.set(key, JSON.stringify(section), "EX", 60 * 10);
    return section;
  }

  @ApiOperation({ summary: "Get reserved slots", description: "Get reserved slots" })
  @ApiParam({ name: "id", description: "Section id" })
  @ApiResponse({ status: 200, description: "Return reserved slots" })
  @ApiResponse({ status: 403, description: "You are not allowed to view this section" })
  @ApiBearerAuth()
  @Roles("ADMIN", "SECURITY")
  @Get(":id/reserved")
  async getReservedSlots(@User() user: UserInterface, @Param("id", ParseIntPipe) id: number) {
    return await this.sectionService.getReservedSlots(user, id);
  }

  @ApiOperation({ summary: "Create a new section" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", example: "B1" },
        capacity: { type: "number", example: 100 }
      },
      required: ["name", "capacity"]
    }
  })
  @ApiResponse({ status: 201, description: "Section created successfully" })
  @ApiResponse({ status: 409, description: "Section name already exists" })
  @ApiResponse({ status: 500, description: "Failed to create section" })
  @ApiBearerAuth()
  @Roles("ADMIN")
  @Post()
  async create(@Body() body: CreateSectionDto) {
    return await this.sectionService.create(body);
  }

  @ApiOperation({ summary: "Update a section" })
  @ApiParam({ name: "id", description: "Section id" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        name: { type: "string", example: "B1" },
        capacity: { type: "number", example: 100 },
        privilegedTo: { type: "array", example: [1, 2, 3] }
      }
    }
  })
  @ApiResponse({ status: 200, description: "Section updated successfully" })
  @ApiResponse({ status: 409, description: "Section name already exists" })
  @ApiResponse({ status: 500, description: "Failed to update section" })
  @ApiBearerAuth()
  @Roles("ADMIN")
  @Patch(":id")
  async update(@User() user: UserInterface, @Param("id", ParseIntPipe) id: number, @Body() body: UpdateSectionDto) {
    return await this.sectionService.update(user, id, body);
  }

  @ApiOperation({ summary: "Delete a section" })
  @ApiParam({ name: "id", description: "Section id" })
  @ApiResponse({ status: 204, description: "Section deleted successfully" })
  @HttpCode(204)
  @ApiBearerAuth()
  @Roles("ADMIN")
  @Delete(":id")
  async delete(@Param("id", ParseIntPipe) id: number) {
    return await this.sectionService.delete(id);
  }

  @ApiOperation({ summary: "Report revenue of a section" })
  @ApiParam({ name: "id", description: "Section id" })
  @ApiQuery({ name: "from", description: "From date", example: "2022-01-01", required: false })
  @ApiQuery({ name: "to", description: "To date", example: "2022-12-31", required: false })
  @ApiResponse({ status: 200, description: "Report generated successfully" })
  @ApiResponse({ status: 403, description: "You are not allowed to view this section report" })
  @ApiBearerAuth()
  @Roles("ADMIN", "SECURITY")
  @Post(":id/report")
  async report(@User() user: UserInterface, @Param("id", ParseIntPipe) id: number, @Query("from") from: string, @Query("to") to: string) {
    return await this.sectionService.report(user, id, from, to);
  }
}
