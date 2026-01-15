import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seed işlemi başlıyor...')

  // 1. Akademik Disiplinleri Oluştur
  const psychology = await prisma.academicDiscipline.upsert({
    where: { code: 'PSY' },
    update: {},
    create: {
      name: 'Psychology',
      code: 'PSY',
      description: 'Study of mind and behavior'
    },
  })

  console.log('Seed verileri başarıyla yüklendi!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })