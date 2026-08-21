import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OilService {
  constructor(private prisma: PrismaService) {}

  async createStation(establishmentId: string, name: string) {
    return this.prisma.oilStation.create({
      data: { establishmentId, name },
    });
  }

  async getStations(establishmentId: string) {
    // Auto-sync: ensure each active Friteuse equipment has a corresponding OilStation.
    // Friteuses are excluded from temperature tracking by design, so the oil tab is
    // their only control surface — they must appear here automatically.
    const friteuseEquipment = await this.prisma.equipment.findMany({
      where: {
        establishmentId,
        type: { equals: 'Friteuse', mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: { name: true },
    });

    if (friteuseEquipment.length > 0) {
      const existingStations = await this.prisma.oilStation.findMany({
        where: { establishmentId },
        select: { name: true },
      });
      const existingNames = new Set(
        existingStations.map((s) => s.name.toLowerCase().trim()),
      );

      for (const equip of friteuseEquipment) {
        if (!existingNames.has(equip.name.toLowerCase().trim())) {
          await this.prisma.oilStation.create({
            data: { establishmentId, name: equip.name },
          });
        }
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
