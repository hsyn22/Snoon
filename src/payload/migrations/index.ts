import * as migration_20260909_024328_initial from './20260909_024328_initial';
import * as migration_20260909_025303_settings from './20260909_025303_settings';
import * as migration_20260909_045900_student_documents from './20260909_045900_student_documents';
import * as migration_20260909_063032_case_expiry from './20260909_063032_case_expiry';
import * as migration_20260909_063652_case_photos from './20260909_063652_case_photos';
import * as migration_20260909_064124_photo_retention from './20260909_064124_photo_retention';
import * as migration_20260909_130322_case_photo_thumb from './20260909_130322_case_photo_thumb';
import * as migration_20260909_175751_phone_guard_settings from './20260909_175751_phone_guard_settings';
import * as migration_20260909_180258_stage_defaults from './20260909_180258_stage_defaults';

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
    name: '20260909_063032_case_expiry',
  },
  {
    up: migration_20260909_063652_case_photos.up,
    down: migration_20260909_063652_case_photos.down,
    name: '20260909_063652_case_photos',
  },
  {
    up: migration_20260909_064124_photo_retention.up,
    down: migration_20260909_064124_photo_retention.down,
    name: '20260909_064124_photo_retention',
  },
  {
    up: migration_20260909_130322_case_photo_thumb.up,
    down: migration_20260909_130322_case_photo_thumb.down,
    name: '20260909_130322_case_photo_thumb',
  },
  {
    up: migration_20260909_175751_phone_guard_settings.up,
    down: migration_20260909_175751_phone_guard_settings.down,
    name: '20260909_175751_phone_guard_settings',
  },
  {
    up: migration_20260909_180258_stage_defaults.up,
    down: migration_20260909_180258_stage_defaults.down,
    name: '20260909_180258_stage_defaults'
  },
];
