import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  addMemberSchema,
  createWorkspaceSchema,
  updateMemberSchema,
  updateWorkspaceSchema,
} from '@finance/shared-validation';
import type {
  AdminWorkspaceSummary,
  AddMemberRequest,
  CreateWorkspaceRequest,
  UpdateMemberRequest,
  UpdateWorkspaceRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(
    @CurrentUser()
    user: RequestUser,
  ) {
    return this.workspacesService.list(user.id);
  }

  @Get('admin/all')
  listAllForAdmin(
    @CurrentUser()
    user: RequestUser,
  ): Promise<AdminWorkspaceSummary[]> {
    return this.workspacesService.listAllForAdmin(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createWorkspaceSchema))
    body: CreateWorkspaceRequest,
  ) {
    return this.workspacesService.create(user.id, body);
  }

  @Get(':workspaceId')
  getDetail(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.getDetail(user.id, workspaceId);
  }

  @Patch(':workspaceId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema))
    body: UpdateWorkspaceRequest,
  ) {
    return this.workspacesService.update(user.id, workspaceId, body);
  }

  @Delete(':workspaceId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.remove(user.id, workspaceId);
  }

  @Get(':workspaceId/members')
  listMembers(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.listMembers(user.id, workspaceId);
  }

  @Post(':workspaceId/members')
  addMember(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(addMemberSchema)) body: AddMemberRequest,
  ) {
    return this.workspacesService.addMember(user.id, workspaceId, body);
  }

  @Patch(':workspaceId/members/:membershipId')
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @Body(new ZodValidationPipe(updateMemberSchema)) body: UpdateMemberRequest,
  ) {
    return this.workspacesService.updateMember(
      user.id,
      workspaceId,
      membershipId,
      body,
    );
  }

  @Delete(':workspaceId/members/:membershipId')
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.workspacesService.removeMember(
      user.id,
      workspaceId,
      membershipId,
    );
  }
}
