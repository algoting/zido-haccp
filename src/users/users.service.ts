import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(establishmentId: string) {
    return this.prisma.user.findMany({
      where: { establishmentId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        establishmentId: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet utilisateur existe déjà');
    }

    return this.prisma.user.create({
      data: {
        email: dto.email,
        role: dto.role,
      },
    });
  }

  async createInEstablishment(dto: CreateUserDto, establishmentId: string) {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        role: dto.role,
        establishmentId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        establishmentId: true,
      },
    });
  }
}
