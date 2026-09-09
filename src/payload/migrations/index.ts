import * as migration_20260909_024328_initial from './20260909_024328_initial';
import * as migration_20260909_025303_settings from './20260909_025303_settings';
import * as migration_20260909_045900_student_documents from './20260909_045900_student_documents';
import * as migration_20260909_063032_case_expiry from './20260909_063032_case_expiry';

export const migrations = [
  {
    up: migration_20260909_024328_initial.up,
    down: migration_20260909_024328_initial.down,
    name: '20260909_024328_initial',
  },
  {
    up: migration_20260909_025303_settings.up,
    down: migration_20260909_025303_settings.down,
    name: '20260909_025303_settings',
  },
  {
    up: migration_20260909_045900_student_documents.up,
    down: migration_20260909_045900_student_documents.down,
    name: '20260909_045900_student_documents',
  },
  {
    up: migration_20260909_063032_case_expiry.up,
    down: migration_20260909_063032_case_expiry.down,
    name: '20260909_063032_case_expiry'
  },
];
