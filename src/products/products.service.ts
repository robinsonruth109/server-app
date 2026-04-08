import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        imageUrl: createProductDto.imageUrl,
        price: createProductDto.price,
        platform: createProductDto.platform,
        vipLevel: createProductDto.vipLevel,
        isActive: createProductDto.isActive ?? true,
      },
    });
  }

  async findAll(search?: string, platform?: string, vipLevel?: number) {
    return this.prisma.product.findMany({
      where: {
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(platform ? { platform } : {}),
        ...(vipLevel ? { vipLevel } : {}),
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: 'Product deleted successfully',
    };
  }
}
