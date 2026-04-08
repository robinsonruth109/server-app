import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function seedDefaultSuperAdmin() {
  const prisma = new PrismaClient();

  try {
    const username = 'sabbirnrk99';
    const plainPassword = 'Sabbir@44477';

    const existingAdmin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      await prisma.admin.create({
        data: {
          username,
          password: hashedPassword,
          role: 'super_admin',
          isActive: true,
        },
      });

      console.log(`✅ Default super admin created: ${username}`);
    } else {
      console.log(`ℹ️ Default super admin already exists: ${username}`);
    }
  } catch (error) {
    console.error('❌ Failed to seed default super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  await seedDefaultSuperAdmin();

  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
