import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncBlulogRestDto, SyncBlulogBluApiDto } from './dto/sync-blulog.dto';
import axios from 'axios';

export interface BlulogMeasurement {
  loggerId: string;
  loggerLabel: string;
  org?: string;
  vrn?: string;
  type: 'tdl' | 'htdl' | 'ltdl' | 'unknown';
  minTemp: number;
  maxTemp: number;
  temperatureC: number;
  humidity?: number;
  light?: number;
  measuredAt: Date;
  batteryPercent?: number;
  batUnderLoad?: boolean;
  hubId?: string;
  hubVrn?: string;
  imei?: string;
  rssi?: number;
  rssiDbm?: number;
  archival?: boolean;
  latitude?: number;
  longitude?: number;
  geolocAccuracy?: number;
}

@Injectable()
export class BlulogService {
  private readonly logger = new Logger(BlulogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Fetch devices & measurements using Blulog RestAPI v1.0.2 (OpenAPI / JSON)
   * Base URL: https://restapi.bluconsole.com/v1
   * Auth Header: X-Access-Token: <TOKEN>
   */
  async fetchRestApiDevices(accessToken: string): Promise<BlulogMeasurement[]> {
    try {
      const response = await axios.get('https://restapi.bluconsole.com/v1/devices', {
        headers: {
          'X-Access-Token': accessToken,
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const devices = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const measurements: BlulogMeasurement[] = [];

      for (const dev of devices) {
        const loggerId = dev.id || dev.serialNumber || dev.code || 'UNKNOWN';
        const label = dev.label || dev.name || dev.description || `Logeur Blulog ${loggerId}`;
        const minTemp = typeof dev.min_temp === 'number' ? dev.min_temp : (dev.minTemp ?? 0);
        const maxTemp = typeof dev.max_temp === 'number' ? dev.max_temp : (dev.maxTemp ?? 8);

        let tempVal: number | null = null;
        let measuredAt: Date = new Date();

        if (dev.lastMeasurement) {
          tempVal = typeof dev.lastMeasurement.t === 'number' ? dev.lastMeasurement.t : parseFloat(dev.lastMeasurement.temperature);
          if (dev.lastMeasurement.utc) {
            measuredAt = new Date(dev.lastMeasurement.utc * 1000);
          } else if (dev.lastMeasurement.timestamp) {
            measuredAt = new Date(dev.lastMeasurement.timestamp);
          }
        } else if (typeof dev.temperature === 'number') {
          tempVal = dev.temperature;
        }

        if (tempVal !== null && !isNaN(tempVal)) {
          measurements.push({
            loggerId,
            loggerLabel: label,
            type: dev.humidity !== undefined ? 'htdl' : 'tdl',
            minTemp,
            maxTemp,
            temperatureC: tempVal,
            humidity: dev.humidity,
            measuredAt,
            batteryPercent: dev.battery || dev.bat,
            hubId: dev.hubId || dev.hub,
          });
        }
      }

      return measurements;
    } catch (error: any) {
      this.logger.error(`Failed to fetch from Blulog RestAPI: ${error?.message}`);
      throw new BadRequestException(`Erreur de connexion à l'API RestAPI Blulog: ${error?.response?.data?.message || error?.message}`);
    }
  }

  /**
   * 2. Fetch devices & measurements using Blulog BluApi v3.2.5 (XML)
   * Base Addresses:
   *  - BC1.0: https://restservice1.bluconsole.com
   *  - BC2.0: https://http-receiver.bluconsole.com
   * Endpoint: BASE_ADDR/bluconsolerest/1.0/resources/devices
   */
  async fetchBluApiDevices(dto: SyncBlulogBluApiDto): Promise<BlulogMeasurement[]> {
    try {
      const baseAddr = dto.serverVersion === 'BC1.0'
        ? 'https://restservice1.bluconsole.com'
        : 'https://http-receiver.bluconsole.com';
      const endpoint = `${baseAddr}/bluconsolerest/1.0/resources/devices`;

      const params: Record<string, any> = {
        uname: dto.uname,
        upass: dto.upass,
      };

      if (dto.id) params.id = dto.id;
      if (dto.hubIds) params.hubIds = dto.hubIds;
      if (dto.hubVrns) params.hubVrns = dto.hubVrns;
      if (dto.fromTime !== undefined) params.fromTime = dto.fromTime;
      if (dto.toTime !== undefined) params.toTime = dto.toTime;
      if (dto.recordings !== undefined) params.recordings = dto.recordings;
      if (dto.ver !== undefined) params.ver = dto.ver;
      if (dto.children !== undefined) params.children = dto.children;
      if (dto.includeAll !== undefined) params.includeAll = dto.includeAll;

      const response = await axios.get(endpoint, {
        params,
        timeout: 12000,
      });

      const xmlText = typeof response.data === 'string' ? response.data : String(response.data);

      if (
        xmlText.includes('<message>bad username or password</message>') ||
        xmlText.includes('<message>Bad username or pass</message>') ||
        xmlText.includes('bad username or password') ||
        xmlText.includes('Bad username')
      ) {
        throw new BadRequestException('Identifiant (uname) ou mot de passe (upass) Blulog incorrect (BluApi v3.2.5)');
      }

      return this.parseBluApiXml(xmlText);
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to fetch from Blulog BluApi v3.2.5: ${error?.message}`);
      throw new BadRequestException(`Impossible d'extraire les données Blulog (BluApi v3.2.5): ${error?.message}`);
    }
  }

  /**
   * Complete XML Parser for Blulog BluApi v3.2.5
   * Parses <tdl>, <htdl>, <ltdl>, <id>, <label>, <org>, <min_temp>, <max_temp>, <vrn>,
   * <ms><m> elements: <t>, <h>, <l>, <utc>, <hub>, <hub_vrn>, <imei>, <rssi>, <bat>, <bat_under_load>, <a>, <lon>, <lat>, <geoloc_accuracy>
   */
  parseBluApiXml(xmlString: string): BlulogMeasurement[] {
    const measurements: BlulogMeasurement[] = [];

    // Match root logger blocks: <tdl>, <htdl>, <ltdl>
    const blockRegex = /<(tdl|htdl|ltdl)>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(xmlString)) !== null) {
      const tagType = match[1].toLowerCase() as 'tdl' | 'htdl' | 'ltdl';
      const blockContent = match[2];

      const getTagVal = (tag: string): string => {
        const r = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, 'i');
        const m = r.exec(blockContent);
        return m ? m[1].trim() : '';
      };

      const loggerId = getTagVal('id') || 'UNKNOWN';
      const label = getTagVal('label') || getTagVal('org') || `Sonde Blulog ${loggerId}`;
      const org = getTagVal('org');
      const vrn = getTagVal('vrn');
      const minTemp = parseFloat(getTagVal('min_temp')) || 0;
      const maxTemp = parseFloat(getTagVal('max_temp')) || 8;
      const batStr = getTagVal('bat');
      const bat = batStr ? parseFloat(batStr) : undefined;
      const batUnderLoad = getTagVal('bat_under_load') === 'true';

      // Parse individual measurements inside <ms><m>...</m></ms>
      const msRegex = /<m>([\s\S]*?)<\/m>/gi;
      let mMatch: RegExpExecArray | null;
      let hasMeasurement = false;

      while ((mMatch = msRegex.exec(blockContent)) !== null) {
        hasMeasurement = true;
        const mContent = mMatch[1];
        const getMTagVal = (tag: string): string => {
          const r = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, 'i');
          const m = r.exec(mContent);
          return m ? m[1].trim() : '';
        };

        const tStr = getMTagVal('t');
        const hStr = getMTagVal('h');
        const lStr = getMTagVal('l');
        const utcStr = getMTagVal('utc');
        const hubStr = getMTagVal('hub');
        const hubVrnStr = getMTagVal('hub_vrn');
        const imeiStr = getMTagVal('imei');
        const rssiStr = getMTagVal('rssi');
        const aStr = getMTagVal('a');
        const latStr = getMTagVal('lat');
        const lonStr = getMTagVal('lon');
        const geolocAccStr = getMTagVal('geoloc_accuracy');

        if (tStr) {
          const tempC = parseFloat(tStr);
          const utcSec = parseInt(utcStr, 10);
          const measuredAt = !isNaN(utcSec) ? new Date(utcSec * 1000) : new Date();

          if (!isNaN(tempC)) {
            const rssiVal = rssiStr ? parseFloat(rssiStr) : undefined;
            measurements.push({
              loggerId,
              loggerLabel: label,
              org: org || undefined,
              vrn: vrn || undefined,
              type: tagType,
              minTemp,
              maxTemp,
              temperatureC: tempC,
              humidity: hStr ? parseFloat(hStr) : undefined,
              light: lStr ? parseFloat(lStr) : undefined,
              measuredAt,
              batteryPercent: bat,
              batUnderLoad,
              hubId: hubStr || undefined,
              hubVrn: hubVrnStr || undefined,
              imei: imeiStr || undefined,
              rssi: rssiVal,
              rssiDbm: rssiVal !== undefined ? rssiVal * -0.5 : undefined,
              archival: aStr === 'Y',
              latitude: latStr ? parseFloat(latStr) : undefined,
              longitude: lonStr ? parseFloat(lonStr) : undefined,
              geolocAccuracy: geolocAccStr ? parseFloat(geolocAccStr) : undefined,
            });
          }
        }
      }

      // Fallback if no <m> tag was present
      if (!hasMeasurement) {
        const tVal = parseFloat(getTagVal('t'));
        if (!isNaN(tVal)) {
          measurements.push({
            loggerId,
            loggerLabel: label,
            org: org || undefined,
            vrn: vrn || undefined,
            type: tagType,
            minTemp,
            maxTemp,
            temperatureC: tVal,
            measuredAt: new Date(),
            batteryPercent: bat,
            batUnderLoad,
          });
        }
      }
    }

    return measurements;
  }

  /**
   * Sync measurements into HACCP Database (Equipment + TemperatureLog + Incident auto-creation)
   */
  async syncToHaccpDatabase(
    establishmentId: string,
    userId: string,
    measurements: BlulogMeasurement[],
    autoCreateEquipment = true,
  ) {
    let equipmentCreated = 0;
    let logsCreated = 0;
    let incidentsCreated = 0;

    for (const m of measurements) {
      // Find existing equipment by name or logger ID
      let equip = await this.prisma.equipment.findFirst({
        where: {
          establishmentId,
          OR: [
            { name: { equals: m.loggerLabel, mode: 'insensitive' } },
            { name: { contains: m.loggerId, mode: 'insensitive' } },
          ],
        },
      });

      if (!equip && autoCreateEquipment) {
        const typeLabel = m.type === 'htdl'
          ? 'Sonde Blulog HTDL (Temp/Hum)'
          : m.type === 'ltdl'
          ? 'Sonde Blulog LTDL (Temp/Lumière)'
          : 'Sonde Blulog TDL (Température)';

        equip = await this.prisma.equipment.create({
          data: {
            establishmentId,
            createdByUserId: userId,
            name: `${m.loggerLabel} (${m.loggerId})`,
            type: typeLabel,
            minTempC: m.minTemp,
            maxTempC: m.maxTemp,
          },
        });
        equipmentCreated++;
      }

      if (equip) {
        const isConform = m.temperatureC >= equip.minTempC && m.temperatureC <= equip.maxTempC;
        const conformity = isConform ? 'OK' : 'OUT_OF_RANGE';

        const tempLog = await this.prisma.temperatureLog.create({
          data: {
            establishmentId,
            equipmentId: equip.id,
            temperatureC: m.temperatureC,
            measuredAt: m.measuredAt,
            conformity: conformity as any,
            recordedByUserId: userId,
          },
        });
        logsCreated++;

        // Auto-create incident if non-conform
        if (!isConform) {
          await this.prisma.incident.create({
            data: {
              establishmentId,
              equipmentId: equip.id,
              type: 'TEMPERATURE_OUT_OF_RANGE' as any,
              triggerTemperatureLogId: tempLog.id,
              status: 'OPEN',
            },
          });
          incidentsCreated++;
        }
      }
    }

    return {
      success: true,
      measurementsProcessed: measurements.length,
      equipmentCreated,
      logsCreated,
      incidentsCreated,
      measurements,
    };
  }

  /**
   * High-level handler for RestAPI Sync
   */
  async syncRestApi(establishmentId: string, userId: string, dto: SyncBlulogRestDto) {
    const measurements = await this.fetchRestApiDevices(dto.accessToken);
    return this.syncToHaccpDatabase(establishmentId, userId, measurements, dto.autoCreateEquipment ?? true);
  }

  /**
   * High-level handler for BluApi v3.2.5 Sync
   */
  async syncBluApi(establishmentId: string, userId: string, dto: SyncBlulogBluApiDto) {
    const measurements = await this.fetchBluApiDevices(dto);
    return this.syncToHaccpDatabase(establishmentId, userId, measurements, dto.autoCreateEquipment ?? true);
  }
}
