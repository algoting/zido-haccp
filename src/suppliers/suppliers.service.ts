import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(establishmentId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        establishmentId,
        name: dto.name,
        phone: dto.phone || null,
        email: dto.email || null,
      },
    });
  }

  async findAll(establishmentId: string) {
    return this.prisma.supplier.findMany({
      where: { establishmentId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, establishmentId: string) {
    return this.prisma.supplier.findFirstOrThrow({
      where: { id, establishmentId },
    });
  }

  async update(id: string, establishmentId: string, dto: UpdateSupplierDto) {
    await this.prisma.supplier.findFirstOrThrow({
      where: { id, establishmentId },
    });
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });
  }

  async remove(id: string, establishmentId: string) {
    await this.prisma.supplier.findFirstOrThrow({
      where: { id, establishmentId },
    });
    await this.prisma.supplier.delete({ where: { id } });
  }
}
