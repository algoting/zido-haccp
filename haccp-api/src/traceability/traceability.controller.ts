import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TraceabilityService } from './traceability.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { AuditService } from '../audit/audit.service';
import type { Request as ExpressRequest, Response } from 'express';
import type { User } from '@prisma/client';

interface AuthenticatedRequest extends ExpressRequest {
  user: User;
}

@Controller('traceability')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class TraceabilityController {
  constructor(
    private traceabilityService: TraceabilityService,
    private auditService: AuditService,
  ) {}

  private requireEstablishmentId(user: User): string {
    if (!user.establishmentId) {
      throw new BadRequestException('establishmentId is required');
    }
    return user.establishmentId;
  }

  /**
   * Get all products for the user's establishment
   */
  @Get('/products')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getProducts(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    const products = await this.traceabilityService.getProductsByEstablishment(
      establishmentId,
      skipNum,
      takeNum,
    );

    const total = await this.traceabilityService.getProductsCount(establishmentId);

    return {
      total,
      products,
    };
  }

  /**
   * Get products by supplier (must be before :id to avoid route conflict)
   */
  @Get('/products/search/supplier/:supplier')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getProductsBySupplier(
    @Request() req: AuthenticatedRequest,
    @Param('supplier') supplier: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const products = await this.traceabilityService.getProductsBySupplier(
      establishmentId,
      supplier,
    );

    return {
      total: products.length,
      products,
    };
  }

  /**
   * Get products expiring soon (must be before :id to avoid route conflict)
   */
  @Get('/products/expiring/soon')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getExpiringProducts(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const daysToCheck = days ? parseInt(days, 10) : 7;
    const products = await this.traceabilityService.getExpiringProductsSoon(
      establishmentId,
      daysToCheck,
    );

    return {
      total: products.length,
      expiringProducts: products,
    };
  }

  /**
   * Get a specific product by ID
   */
  @Get('/products/:id')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getProduct(
    @Request() req: AuthenticatedRequest,
    @Param('id') productId: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    return this.traceabilityService.getProductById(productId, establishmentId);
  }

  /**
   * Create a new product
   */
  @Post('/products')
  @Roles('OWNER', 'STAFF')
  @UseGuards(SubscriptionStateGuard)
  async createProduct(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateProductDto,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);

    const product = await this.traceabilityService.createProduct(
      establishmentId,
      req.user.id,
      dto,
    );

    // Log audit trail
    await this.auditService.logAction(
      establishmentId,
      'PRODUCT_CREATED',
      'Product',
      product.id,
      null,
      {
        name: product.name,
        supplier: product.supplier,
        batchNumber: product.batchNumber,
        expiryDate: product.expiryDate,
      },
      req.user,
    );

    return product;
  }

  /**
   * Add a photo to a product
   */
  @Post('/products/:id/photos')
  @Roles('OWNER', 'STAFF')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async addProductPhoto(
    @Request() req: AuthenticatedRequest,
    @Param('id') productId: string,
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
    @Body() body: { photoUrl?: string },
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);

    if (!file && !body.photoUrl) {
      throw new BadRequestException('photo file or photoUrl is required');
    }

    if (file) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
      }
    }
    if (body.photoUrl && !/^https?:\/\//i.test(body.photoUrl)) {
      throw new BadRequestException('Invalid photo URL');
    }

    const photoUrl = file
      ? await this.traceabilityService.uploadProductPhoto(
          establishmentId,
          file.buffer,
          file.originalname,
          file.mimetype,
        )
      : body.photoUrl;

    const photo = await this.traceabilityService.addProductPhoto(
      productId,
      establishmentId,
      photoUrl as string,
    );

    return photo;
  }

  /**
   * Generate a printable PDF label for a product
   */
  @Get('/products/:id/label')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getProductLabel(
    @Request() req: AuthenticatedRequest,
    @Param('id') productId: string,
    @Res() res: Response,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const product = await this.traceabilityService.getProductById(productId, establishmentId);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const pdfBuffer = await this.traceabilityService.generateProductLabelPDF(
      product,
      frontendUrl,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="label-${product.name.replace(/\s+/g, '-')}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  /**
   * Delete a product (only OWNER)
   */
  @Delete('/products/:id')
  @Roles('OWNER')
  @UseGuards(SubscriptionStateGuard)
  async deleteProduct(
    @Request() req: AuthenticatedRequest,
    @Param('id') productId: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);

    // Get product before deletion for audit log
    const product = await this.traceabilityService.getProductById(
      productId,
      establishmentId,
    );

    await this.traceabilityService.deleteProduct(productId, establishmentId);

    // Log audit trail
    await this.auditService.logAction(
      establishmentId,
      'PRODUCT_DELETED',
      'Product',
      productId,
      {
        name: product.name,
        supplier: product.supplier,
        batchNumber: product.batchNumber,
      },
      null,
      req.user,
    );

    return { message: 'Product deleted successfully' };
  }
}
