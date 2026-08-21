import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OilService {
  constructor(private prisma: PrismaService) {}

  async createStation(establishmentId: string, name: string) {
    const trimmedName = name.trim();
    const station = await this.prisma.oilStation.create({
      data: { establishmentId, name: trimmedName, active: true },
    });

    // Also ensure it exists in Equipment table
    const existingEquip = await this.prisma.equipment.findFirst({
      where: {
        establishmentId,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (!existingEquip) {
      const est = await this.prisma.establishment.findUnique({
        where: { id: establishmentId },
      });
      if (est) {
        await this.prisma.equipment.create({
          data: {
            establishmentId,
            name: trimmedName,
            type: 'Friteuse',
            minTempC: 160,
            maxTempC: 190,
            createdByUserId: est.ownerId,
            status: 'ACTIVE',
          },
        });
      }
    }

    return station;
  }

  async getStations(establishmentId: string) {
    // Auto-sync: Find any active Equipment of type "Friteuse" that isn't in OilStation yet
    const fryerEquipments = await this.prisma.equipment.findMany({
      where: {
        establishmentId,
        status: 'ACTIVE',
        type: {
          contains: 'frit',
          mode: 'insensitive',
        },
      },
    });

    const existingStations = await this.prisma.oilStation.findMany({
      where: { establishmentId },
    });

    const existingNames = new Set(existingStations.map((s) => s.name.toLowerCase()));

    for (const fryer of fryerEquipments) {
      if (!existingNames.has(fryer.name.toLowerCase())) {
        await this.prisma.oilStation.create({
          data: {
            establishmentId,
            name: fryer.name,
            active: true,
          },
        });
        existingNames.add(fryer.name.toLowerCase());
      }
    }

    return this.prisma.oilStation.findMany({
      where: { establishmentId, active: true },
      include: {
        checks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getStation(id: string, establishmentId: string) {
    const station = await this.prisma.oilStation.findFirst({
      where: { id, establishmentId },
    });

    if (!station) {
      throw new NotFoundException("Station d'huile non trouvée");
    }

    return station;
  }

  async recordCheck(
    stationId: string,
    establishmentId: string,
    userId: string,
    data: {
      quality: 'GOOD' | 'BAD';
      oilChanged: boolean;
      polarity?: number;
      method: string;
      notes?: string;
    },
  ) {
    await this.getStation(stationId, establishmentId); // Verify station exists in establishment

    return this.prisma.oilCheck.create({
      data: {
        stationId,
        quality: data.quality,
        oilChanged: data.oilChanged,
        polarity: data.polarity,
        method: data.method,
        notes: data.notes,
        recordedByUserId: userId,
      },
      include: { recordedBy: { select: { email: true } } },
    });
  }

  async getCheckHistory(stationId: string, establishmentId: string, take = 50) {
    await this.getStation(stationId, establishmentId);

    return this.prisma.oilCheck.findMany({
      where: { stationId },
      include: { recordedBy: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getLastCheckForStation(stationId: string) {
    return this.prisma.oilCheck.findFirst({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivateStation(id: string, establishmentId: string) {
    await this.getStation(id, establishmentId);

    return this.prisma.oilStation.update({
      where: { id },
      data: { active: false },
    });
  }
}
