import * as migration_20260909_024328_initial from './20260909_024328_initial';

export const migrations = [
  {
    up: migration_20260909_024328_initial.up,
    down: migration_20260909_024328_initial.down,
    name: '20260909_024328_initial'
  },
];
