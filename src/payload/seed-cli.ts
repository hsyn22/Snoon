import { seed } from './seed'

const result = await seed()
console.info(`Seed complete: ${result.created} created, ${result.existing} already present.`)
process.exit(0)
