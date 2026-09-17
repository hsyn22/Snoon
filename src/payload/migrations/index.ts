import * as migration_20260909_024328_initial from './20260909_024328_initial';
import * as migration_20260909_025303_settings from './20260909_025303_settings';
import * as migration_20260909_045900_student_documents from './20260909_045900_student_documents';
import * as migration_20260909_063032_case_expiry from './20260909_063032_case_expiry';
import * as migration_20260909_063652_case_photos from './20260909_063652_case_photos';
import * as migration_20260909_064124_photo_retention from './20260909_064124_photo_retention';
import * as migration_20260909_130322_case_photo_thumb from './20260909_130322_case_photo_thumb';
import * as migration_20260909_175751_phone_guard_settings from './20260909_175751_phone_guard_settings';
import * as migration_20260909_180258_stage_defaults from './20260909_180258_stage_defaults';
import * as migration_20260910_212909_contact_grace from './20260910_212909_contact_grace';
import * as migration_20260910_213352_contact_retention from './20260910_213352_contact_retention'
import * as migration_20260916_090000_university_is_the_college from './20260916_090000_university_is_the_college';
import * as migration_20260917_210000_upload_prefix from './20260917_210000_upload_prefix';
import * as migration_20260918_010000_claim_limit from './20260918_010000_claim_limit';

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
    name: '20260909_180258_stage_defaults',
  },
  {
    up: migration_20260910_212909_contact_grace.up,
    down: migration_20260910_212909_contact_grace.down,
    name: '20260910_212909_contact_grace',
  },
  {
    up: migration_20260910_213352_contact_retention.up,
    down: migration_20260910_213352_contact_retention.down,
    name: '20260910_213352_contact_retention'
  },
  {
    up: migration_20260916_090000_university_is_the_college.up,
    down: migration_20260916_090000_university_is_the_college.down,
    name: '20260916_090000_university_is_the_college',
  },
  {
    up: migration_20260917_210000_upload_prefix.up,
    down: migration_20260917_210000_upload_prefix.down,
    name: '20260917_210000_upload_prefix',
  },
  {
    up: migration_20260918_010000_claim_limit.up,
    down: migration_20260918_010000_claim_limit.down,
    name: '20260918_010000_claim_limit',
  },
];
