const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.tabItem.deleteMany();
  await prisma.tab.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.recurringGroup.deleteMany();
  await prisma.client.deleteMany();
  await prisma.court.deleteMany();
  await prisma.user.deleteMany();
  await prisma.complex.deleteMany();

  console.log('✨ Dados limpos!');

  // Criar complexo de exemplo
  const complex = await prisma.complex.create({
    data: {
      name: 'Arena Sports Center',
      cnpj: '12.345.678/0001-90'
    }
  });

  console.log('✅ Complexo criado:', complex.name);

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      firstName: 'João',
      lastName: 'Silva',
      email: 'admin@quadracerta.com',
      password: hashedPassword,
      cpf: '123.456.789-00',
      cnpj: '12.345.678/0001-90',
      phone: '(51) 99999-9999',
      role: 'ADMIN',
      complexId: complex.id
    }
  });

  console.log('✅ Usuário admin criado:', adminUser.email);

  // Criar quadras
  const courts = await Promise.all([
    prisma.court.create({
      data: {
        name: 'Quadra 1 - Society',
        sportType: 'Futebol Society',
        capacity: 14,
        pricePerHour: 120.00,
        description: 'Quadra de grama sintética, com iluminação',
        status: 'AVAILABLE',
        complexId: complex.id
      }
    }),
    prisma.court.create({
      data: {
        name: 'Quadra 2 - Futsal',
        sportType: 'Futsal',
        capacity: 10,
        pricePerHour: 100.00,
        description: 'Quadra coberta, piso de madeira',
        status: 'AVAILABLE',
        complexId: complex.id
      }
    }),
    prisma.court.create({
      data: {
        name: 'Quadra 3 - Tênis',
        sportType: 'Tênis',
        capacity: 4,
        pricePerHour: 80.00,
        description: 'Quadra de saibro, coberta',
        status: 'AVAILABLE',
        complexId: complex.id
      }
    }),
    prisma.court.create({
      data: {
        name: 'Quadra 4 - Vôlei',
        sportType: 'Vôlei',
        capacity: 12,
        pricePerHour: 90.00,
        description: 'Quadra de areia, ao ar livre',
        status: 'MAINTENANCE',
        complexId: complex.id
      }
    })
  ]);

  console.log('✅ Quadras criadas:', courts.length);

  // Criar clientes
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        fullName: 'Carlos Eduardo Souza',
        phone: '(51) 98888-7777',
        email: 'carlos@email.com',
        cpf: '111.222.333-44',
        complexId: complex.id
      }
    }),
    prisma.client.create({
      data: {
        fullName: 'Maria Fernanda Costa',
        phone: '(51) 97777-6666',
        email: 'maria@email.com',
        cpf: '222.333.444-55',
        complexId: complex.id
      }
    }),
    prisma.client.create({
      data: {
        fullName: 'Pedro Henrique Lima',
        phone: '(51) 96666-5555',
        email: 'pedro@email.com',
        complexId: complex.id
      }
    }),
    prisma.client.create({
      data: {
        fullName: 'Ana Paula Ferreira',
        phone: '(51) 95555-4444',
        email: 'ana@email.com',
        cpf: '333.444.555-66',
        complexId: complex.id
      }
    })
  ]);

  console.log('✅ Clientes criados:', clients.length);

  // Criar reservas futuras
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const reservations = await Promise.all([
    prisma.reservation.create({
      data: {
        courtId: courts[0].id,
        clientId: clients[0].id,
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        status: 'CONFIRMED'
      }
    }),
    prisma.reservation.create({
      data: {
        courtId: courts[1].id,
        clientId: clients[1].id,
        startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
        status: 'CONFIRMED'
      }
    })
  ]);

  console.log('✅ Reservas criadas:', reservations.length);

  // Criar produtos
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Água Mineral 500ml',
        description: 'Água mineral sem gás',
        price: 3.50,
        stock: 50,
        unit: 'UNIDADE',
        complexId: complex.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Refrigerante Lata',
        description: 'Refrigerante diversos sabores',
        price: 5.00,
        stock: 30,
        unit: 'UNIDADE',
        complexId: complex.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Isotônico',
        description: 'Bebida isotônica 500ml',
        price: 6.00,
        stock: 25,
        unit: 'UNIDADE',
        complexId: complex.id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Chocolate',
        description: 'Barra de chocolate',
        price: 4.50,
        stock: 8,
        unit: 'UNIDADE',
        complexId: complex.id
      }
    })
  ]);

  console.log('✅ Produtos criados:', products.length);

  // Criar comanda de exemplo
  const tab = await prisma.tab.create({
    data: {
      clientId: clients[0].id,
      reservationId: reservations[0].id,
      status: 'OPEN',
      total: 0
    }
  });

  const superAdmin = await prisma.user.create({
    data: {
      firstName: 'Quadra',
      lastName: 'Certa',
      email: 'quadracerta@gmail.com',
      password: await bcrypt.hash('Quadracerta1811@', 10),
      phone: '(53) 98125-9200',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      complexId: null 
    }
  });

  await prisma.tabItem.create({
    data: {
      tabId: tab.id,
      productId: products[0].id,
      description: products[0].name,
      quantity: 2,
      unitPrice: products[0].price,
      total: products[0].price * 2
    }
  });

  await prisma.tab.update({
    where: { id: tab.id },
    data: { total: products[0].price * 2 }
  });

  console.log('✅ Comanda criada');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('   Email: admin@quadracerta.com');
  console.log('   Senha: admin123');
  console.log('\n🌐 Acesse: http://localhost:3000\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
