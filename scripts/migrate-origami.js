/**
 * Origami SQL Server → Supabase Migration Script
 *
 * Prerequisites:
 *   npm install msnodesqlv8 @supabase/supabase-js dotenv
 *
 * Usage:
 *   node scripts/migrate-origami.js
 */

const msnodesqlv8 = require('msnodesqlv8')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const BATCH_SIZE = 500

// Helper: query SQL Server with promises
function querySQL(connectionString, sql) {
  return new Promise((resolve, reject) => {
    msnodesqlv8.query(connectionString, sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

// Column mappings: SQL Server column name → Supabase column name
const TABLE_CONFIG = {
  Carriers: {
    supabaseTable: 'origami_carriers',
    columns: {
      CarrierID: 'carrier_id',
      DisplayCode: 'display_code',
      ClientID: 'client_id',
      Description: 'description',
      LegalName: 'legal_name',
      FEIN: 'fein',
      TypeOfInsurer: 'type_of_insurer',
      IsInactive: 'is_inactive',
      ParentCarrierID: 'parent_carrier_id',
      AMBestRating: 'am_best_rating',
      StandardAndPoorRating: 'standard_and_poor_rating',
      FinancialCategory: 'financial_category',
      NAICNumber: 'naic_number',
      InactiveDate: 'inactive_date',
      MailingName: 'mailing_name',
      Address1: 'address1',
      Address2: 'address2',
      City: 'city',
      StateID: 'state_id',
      PostalCode: 'postal_code',
      SiteID: 'site_id',
      PhoneNumber: 'phone_number',
      Fax: 'fax',
      Email: 'email',
      NCCICode: 'ncci_code',
      County: 'county',
      StateLicenseNumber: 'state_license_number',
      AMBestNumber: 'am_best_number',
      AMBestParentNumber: 'am_best_parent_number',
      AMBestRatingOutlook: 'am_best_rating_outlook',
      AMBestRatingAction: 'am_best_rating_action',
      AMBestEffectiveDate: 'am_best_effective_date',
      Sequence: 'sequence',
      BillingName: 'billing_name',
      BillingStreet1: 'billing_street1',
      BillingStreet2: 'billing_street2',
      BillingCity: 'billing_city',
      BillingStateID: 'billing_state_id',
      BillingPostalCode: 'billing_postal_code',
      EntryUserID: 'entry_user_id',
      EntryDate: 'entry_date',
      ModifiedUserID: 'modified_user_id',
      ModifiedDate: 'modified_date',
    }
  },
  Clients: {
    supabaseTable: 'origami_clients',
    columns: {
      ClientID: 'client_id',
      Name: 'name',
      IsActive: 'is_active',
      GlobalID: 'global_id',
      UrlPrefix: 'url_prefix',
      Street1: 'street1',
      Street2: 'street2',
      City: 'city',
      State: 'state',
      PostalCode: 'postal_code',
      PrimaryContactUserID: 'primary_contact_user_id',
      PrimaryContactName: 'primary_contact_name',
      PrimaryContactEmail: 'primary_contact_email',
      PrimaryContactPhone: 'primary_contact_phone',
      ReferenceNumber: 'reference_number',
      ManageGlobalRecordsFlag: 'manage_global_records_flag',
      ClientTypeID: 'client_type_id',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
      CarrierID: 'carrier_id',
      BrokerID: 'broker_id',
      BillingAccountID: 'billing_account_id',
      LogoImageFileName: 'logo_image_file_name',
      DisableMobileClaimantApp: 'disable_mobile_claimant_app',
      AuditLocationValues: 'audit_location_values',
      PrefundingAmount: 'prefunding_amount',
      ParentCarrierID: 'parent_carrier_id',
    }
  },
  Claims: {
    supabaseTable: 'origami_claims',
    columns: {
      ClaimID: 'claim_id',
      ClientID: 'client_id',
      CoverageID: 'coverage_id',
      ClaimNumber: 'claim_number',
      ClaimSequence: 'claim_sequence',
      OccurrenceNumber: 'occurrence_number',
      PriorClaimNumber: 'prior_claim_number',
      ClaimOfficeID: 'claim_office_id',
      ClaimAdjusterName: 'claim_adjuster_name',
      ClaimAdjusterPhone: 'claim_adjuster_phone',
      Site: 'site',
      IncidentID: 'incident_id',
      LossDate: 'loss_date',
      LossDayOfWeek: 'loss_day_of_week',
      LossTime: 'loss_time',
      ReportDate: 'report_date',
      EmployerReportDate: 'employer_report_date',
      FirstClaimantContactDate: 'first_claimant_contact_date',
      LastClaimantContactDate: 'last_claimant_contact_date',
      LastCloseDate: 'last_close_date',
      FirstCloseDate: 'first_close_date',
      LastReopenDate: 'last_reopen_date',
      LocationID: 'location_id',
      AccidentStateID: 'accident_state_id',
      JurisdictionStateID: 'jurisdiction_state_id',
      Claimant: 'claimant',
      SocialSecurity: 'social_security',
      LossDescription: 'loss_description',
      EventDescription: 'event_description',
      MajorInjury: 'major_injury',
      SourceID: 'source_id',
      CarrierID: 'carrier_id',
      CauseID: 'cause_id',
      BodyPartID: 'body_part_id',
      NatureID: 'nature_id',
      Excess: 'excess',
      Subrogation: 'subrogation',
      Rehabilitation: 'rehabilitation',
      Surgery: 'surgery',
      LawsuitFiled: 'lawsuit_filed',
      SuitDate: 'suit_date',
      SuitResult: 'suit_result',
      SuitType: 'suit_type',
      LawsuitLikely: 'lawsuit_likely',
      Status: 'status',
      DetailStatus: 'detail_status',
      ReferenceNumber: 'reference_number',
      PolicyID: 'policy_id',
      OSHARecordable: 'osha_recordable',
      DisabilityDate: 'disability_date',
      LastWorkedDate: 'last_worked_date',
      RTWFullDate: 'rtw_full_date',
      RTWRestrictedDate: 'rtw_restricted_date',
      LostDays: 'lost_days',
      RestrictedDays: 'restricted_days',
      OSHACode: 'osha_code',
      ClaimantAddress1: 'claimant_address1',
      ClaimantAddress2: 'claimant_address2',
      ClaimantCity: 'claimant_city',
      ClaimantStateID: 'claimant_state_id',
      ClaimantPostalCode: 'claimant_postal_code',
      ClaimantCountryID: 'claimant_country_id',
      ClaimantHomePhone: 'claimant_home_phone',
      ClaimantWorkPhone: 'claimant_work_phone',
      ClaimantEmail: 'claimant_email',
      ClaimantAge: 'claimant_age',
      BirthDate: 'birth_date',
      DeathDate: 'death_date',
      NumberOfDependents: 'number_of_dependents',
      MaritalStatus: 'marital_status',
      Gender: 'gender',
      HireDate: 'hire_date',
      LengthOfService: 'length_of_service',
      StateAssignedClaimNumber: 'state_assigned_claim_number',
      JobClassificationID: 'job_classification_id',
      Occupation: 'occupation',
      DepartmentName: 'department_name',
      DepartmentID: 'department_id',
      Supervisor: 'supervisor',
      LawFirm: 'law_firm',
      LeadAttorney: 'lead_attorney',
      Court: 'court',
      ExpectedSettlementAmount: 'expected_settlement_amount',
      ActualSettlementAmount: 'actual_settlement_amount',
      LastSettlementOfferGiven: 'last_settlement_offer_given',
      LastSettlementOfferReceived: 'last_settlement_offer_received',
      EmploymentStatus: 'employment_status',
      AverageWeeklyWage: 'average_weekly_wage',
      VIN: 'vin',
      VehicleMake: 'vehicle_make',
      VehicleModel: 'vehicle_model',
      VehicleYear: 'vehicle_year',
      DriverName: 'driver_name',
      DriversLicenseNumber: 'drivers_license_number',
      DriversLicenseStateID: 'drivers_license_state_id',
      DriverAge: 'driver_age',
      DriverGender: 'driver_gender',
      DriverChargeable: 'driver_chargeable',
      LossPayeeName: 'loss_payee_name',
      ProductName: 'product_name',
      ProductID: 'product_id',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
      FirstTransactionDate: 'first_transaction_date',
      LastTransactionDate: 'last_transaction_date',
      Paid1: 'paid1',
      Paid2: 'paid2',
      Paid3: 'paid3',
      Paid4: 'paid4',
      Paid5: 'paid5',
      Paid6: 'paid6',
      Paid7: 'paid7',
      Reserve1: 'reserve1',
      Reserve2: 'reserve2',
      Reserve3: 'reserve3',
      Reserve4: 'reserve4',
      Reserve5: 'reserve5',
      Reserve6: 'reserve6',
      Reserve7: 'reserve7',
      Recovery1: 'recovery1',
      Recovery2: 'recovery2',
      Recovery3: 'recovery3',
      Recovery4: 'recovery4',
      Recovery5: 'recovery5',
      Recovery6: 'recovery6',
      Recovery7: 'recovery7',
      RecordOnly1: 'record_only1',
      RecordOnly2: 'record_only2',
      RecordOnly3: 'record_only3',
      RecordOnly4: 'record_only4',
      RecordOnly5: 'record_only5',
      RecordOnly6: 'record_only6',
      RecordOnly7: 'record_only7',
      TPAClaimNumber: 'tpa_claim_number',
      CarrierPolicyNumber: 'carrier_policy_number',
      CarrierPolicyEffectiveDate: 'carrier_policy_effective_date',
      EventLocation: 'event_location',
      AccidentTypeID: 'accident_type_id',
      Preventable: 'preventable',
      DOTRecordable: 'dot_recordable',
      AccidentLongitude: 'accident_longitude',
      AccidentLatitude: 'accident_latitude',
      DetailCauseID: 'detail_cause_id',
      DetailBodyPartID: 'detail_body_part_id',
      DetailNatureID: 'detail_nature_id',
      DetailAccidentTypeID: 'detail_accident_type_id',
      LeadClaim: 'lead_claim',
      SettlementDate: 'settlement_date',
      SuitResponseDate: 'suit_response_date',
      WCBenefitType: 'wc_benefit_type',
      InitialTreatmentCode: 'initial_treatment_code',
      EmployeeNumber: 'employee_number',
      AdjusterUserID: 'adjuster_user_id',
      HICN: 'hicn',
      ExcessPolicyID: 'excess_policy_id',
      DiscoveryDate: 'discovery_date',
      ResolutionDate: 'resolution_date',
      AnswerDate: 'answer_date',
      AssignmentDate: 'assignment_date',
      TrialDate: 'trial_date',
      MediationDate: 'mediation_date',
      EscrowAmount: 'escrow_amount',
      AllegedDamages: 'alleged_damages',
      EstimatedVerdictValue: 'estimated_verdict_value',
      CaseOverview: 'case_overview',
      SummaryOfFacts: 'summary_of_facts',
      VerdictComments: 'verdict_comments',
      DocketNumber: 'docket_number',
      CaseNumber: 'case_number',
      DefenseCounselAttorney: 'defense_counsel_attorney',
      DefenseCounselFirm: 'defense_counsel_firm',
      PlaintiffCounselAttorney: 'plaintiff_counsel_attorney',
      PlaintiffCounselFirm: 'plaintiff_counsel_firm',
      AccidentStreet1: 'accident_street1',
      AccidentStreet2: 'accident_street2',
      AccidentCity: 'accident_city',
      AccidentPostalCode: 'accident_postal_code',
      SecondaryLocationID: 'secondary_location_id',
      EmployeeID: 'employee_id',
      VehicleID: 'vehicle_id',
      PolicyCoverageID: 'policy_coverage_id',
      IsCancelled: 'is_cancelled',
      IsPrivate: 'is_private',
      AcquiredClaim: 'acquired_claim',
      SingleClaimOccurrence: 'single_claim_occurrence',
      CatastropheID: 'catastrophe_id',
      ProgramID: 'program_id',
      MemberID: 'member_id',
      CurrencyID: 'currency_id',
      LossEventID: 'loss_event_id',
    }
  },
  Codes: {
    supabaseTable: 'origami_codes',
    columns: {
      CodeID: 'code_id',
      ClientID: 'client_id',
      DisplayCode: 'display_code',
      Description: 'description',
      MajorCoverageID: 'major_coverage_id',
      CodeTypeID: 'code_type_id',
      IsInactive: 'is_inactive',
      Sequence: 'sequence',
      InactiveDate: 'inactive_date',
      EDI: 'edi',
      MajorCoverageIDs: 'major_coverage_ids',
    }
  },
  Hierarchies: {
    supabaseTable: 'origami_hierarchies',
    columns: {
      HierarchyID: 'hierarchy_id',
      ClientID: 'client_id',
      Name: 'name',
      Level1Label: 'level1_label',
      Level2Label: 'level2_label',
      Level3Label: 'level3_label',
      Level4Label: 'level4_label',
      Level5Label: 'level5_label',
      Level6Label: 'level6_label',
      Level7Label: 'level7_label',
      Level8Label: 'level8_label',
      Level9Label: 'level9_label',
      Level10Label: 'level10_label',
    }
  },
  Incidents: {
    supabaseTable: 'origami_incidents',
    columns: {
      IncidentID: 'incident_id',
      ClientID: 'client_id',
      IncidentTypeID: 'incident_type_id',
      IncidentNumber: 'incident_number',
      Status: 'status',
      Claimant: 'claimant',
      BirthDate: 'birth_date',
      ClaimantAge: 'claimant_age',
      Gender: 'gender',
      MaritalStatus: 'marital_status',
      LossDate: 'loss_date',
      LossTime: 'loss_time',
      ReportDate: 'report_date',
      EmployerReportDate: 'employer_report_date',
      LocationID: 'location_id',
      AccidentStreet1: 'accident_street1',
      AccidentCity: 'accident_city',
      AccidentCounty: 'accident_county',
      AccidentStateID: 'accident_state_id',
      AccidentPostalCode: 'accident_postal_code',
      TimeBeganWork: 'time_began_work',
      DeathDate: 'death_date',
      CauseID: 'cause_id',
      SocialSecurity: 'social_security',
      EventDescription: 'event_description',
      LossDescription: 'loss_description',
      ActivityDuringAccident: 'activity_during_accident',
      ObjectCausingInjury: 'object_causing_injury',
      MajorInjury: 'major_injury',
      NatureID: 'nature_id',
      BodyPartID: 'body_part_id',
      OSHARecordable: 'osha_recordable',
      OSHACaseNumber: 'osha_case_number',
      ClaimantAddress1: 'claimant_address1',
      ClaimantAddress2: 'claimant_address2',
      ClaimantCity: 'claimant_city',
      ClaimantStateID: 'claimant_state_id',
      ClaimantPostalCode: 'claimant_postal_code',
      ClaimantCountryID: 'claimant_country_id',
      ClaimantHomePhone: 'claimant_home_phone',
      ClaimantWorkPhone: 'claimant_work_phone',
      HireDate: 'hire_date',
      Occupation: 'occupation',
      DepartmentName: 'department_name',
      Supervisor: 'supervisor',
      EmploymentStatus: 'employment_status',
      AverageWeeklyWage: 'average_weekly_wage',
      DateOfFirstTreatment: 'date_of_first_treatment',
      LastWorkedDate: 'last_worked_date',
      HospitalName: 'hospital_name',
      HospitalStreet1: 'hospital_street1',
      HospitalCity: 'hospital_city',
      HospitalStateID: 'hospital_state_id',
      HospitalPostalCode: 'hospital_postal_code',
      PhysicianName: 'physician_name',
      PhysicianAddress: 'physician_address',
      PhysicianPhone: 'physician_phone',
      DriverName: 'driver_name',
      VehicleMake: 'vehicle_make',
      VehicleModel: 'vehicle_model',
      VehicleYear: 'vehicle_year',
      DriversLicenseNumber: 'drivers_license_number',
      DriversLicenseStateID: 'drivers_license_state_id',
      VIN: 'vin',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  Locations: {
    supabaseTable: 'origami_locations',
    columns: {
      LocationID: 'location_id',
      ClientID: 'client_id',
      LocationNumber: 'display_code',
      Name: 'description',
      Street1: 'street1',
      Street2: 'street2',
      City: 'city',
      StateID: 'state_id',
      PostalCode: 'postal_code',
      County: 'county',
      CountryID: 'country_id',
      Longitude: 'longitude',
      Latitude: 'latitude',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  LocationValues: {
    supabaseTable: 'origami_location_values',
    columns: {
      LocationValueID: 'location_value_id',
      ClientID: 'client_id',
      LocationID: 'location_id',
      StateID: 'state_id',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  Policies: {
    supabaseTable: 'origami_policies',
    columns: {
      PolicyID: 'policy_id',
      ClientID: 'client_id',
      PolicyNumber: 'policy_number',
      Description: 'description',
      EffectiveDate: 'effective_date',
      ExpiryDate: 'expiration_date',
      CoverageID: 'major_coverage_id',
      PolicyType: 'status',
      Premium: 'premium',
      ProgramID: 'program_id',
      CurrencyID: 'currency_id',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  PolicyCarriers: {
    supabaseTable: 'origami_policy_carriers',
    columns: {
      PolicyCarrierID: 'policy_carrier_id',
      ClientID: 'client_id',
      PolicyID: 'policy_id',
      CarrierID: 'carrier_id',
      PolicyNumber: 'policy_number',
      QuotaShare: 'participation',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  PolicyCoverages: {
    supabaseTable: 'origami_policy_coverages',
    columns: {
      PolicyCoverageID: 'policy_coverage_id',
      ClientID: 'client_id',
      PolicyID: 'policy_id',
      CoverageID: 'coverage_id',
      Description: 'description',
      '[Limit]': 'limit',
      Deductible: 'deductible',
      Premium: 'premium',
      AttachAmount: 'attachment_point',
      AggregateLimit: 'aggregate_limit',
      OccurrenceLimit: 'per_occurrence_limit',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  PolicyNamedInsureds: {
    supabaseTable: 'origami_policy_named_insureds',
    columns: {
      PolicyNamedInsuredID: 'policy_named_insured_id',
      ClientID: 'client_id',
      PolicyID: 'policy_id',
      Comments: 'description',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
  Notes: {
    supabaseTable: 'origami_notes',
    columns: {
      NoteID: 'note_id',
      ParentDomainID: 'parent_domain_id',
      ParentID: 'parent_id',
      Subject: 'subject',
      Body: 'body',
      AuthorName: 'author_name',
      EntryDate: 'entry_date',
      ModifiedDate: 'modified_date',
      NoteTypeID: 'note_type_id',
      ClientID: 'client_id',
      EntryUserID: 'entry_user_id',
    }
  },
  Users: {
    supabaseTable: 'origami_users',
    columns: {
      UserID: 'user_id',
      FirstName: 'first_name',
      LastName: 'last_name',
      Email: 'email',
      Title: 'title',
      CompanyName: 'company_name',
      IsInactive: 'is_inactive',
    }
  },
  Territories: {
    supabaseTable: 'origami_territories',
    columns: {
      TerritoryID: 'territory_id',
      ClientID: 'client_id',
      HierarchyID: 'hierarchy_id',
      ParentTerritoryID: 'parent_territory_id',
      TerritoryNumber: 'display_code',
      Name: 'description',
      InactiveDate: 'is_inactive',
      EntryDate: 'entry_date',
      EntryUserID: 'entry_user_id',
      ModifiedDate: 'modified_date',
      ModifiedUserID: 'modified_user_id',
    }
  },
}

// Map a SQL Server row to a Supabase row using column config
function mapRow(row, columnMapping) {
  const mapped = {}
  for (const [sqlCol, pgCol] of Object.entries(columnMapping)) {
    // Handle bracketed column names like [Limit]
    const lookupCol = sqlCol.replace(/^\[|\]$/g, '')
    if (row[lookupCol] !== undefined) {
      let val = row[lookupCol]
      if (Buffer.isBuffer(val)) val = val[0] === 1
      if (val instanceof Date) val = val.toISOString()
      if (typeof val === 'string') val = val.trim() || null
      mapped[pgCol] = val
    }
  }
  return mapped
}

async function migrateTable(connectionString, supabase, tableName, config) {
  // Build SELECT with bracketed reserved words
  const sqlColumns = Object.keys(config.columns).map(c => {
    if (c.startsWith('[')) return c  // already bracketed
    return c
  }).join(', ')

  console.log(`\n📋 ${tableName} → ${config.supabaseTable}`)
  console.log(`   Querying ${Object.keys(config.columns).length} columns...`)

  const rows = await querySQL(connectionString, `SELECT ${sqlColumns} FROM ${tableName}`)
  console.log(`   Found ${rows.length} rows`)

  if (rows.length === 0) return

  // Insert in batches
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(row => mapRow(row, config.columns))

    const { error } = await supabase
      .from(config.supabaseTable)
      .upsert(batch, { onConflict: Object.values(config.columns)[0] })

    if (error) {
      console.error(`   ❌ Error at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      if (i === 0) console.error('   Sample row:', JSON.stringify(batch[0], null, 2).slice(0, 500))
      continue
    }

    inserted += batch.length
    process.stdout.write(`   ✅ ${inserted}/${rows.length} rows\r`)
  }
  console.log(`   ✅ ${inserted}/${rows.length} rows inserted`)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const mssqlServer = process.env.MSSQL_SERVER
  const mssqlDatabase = process.env.MSSQL_DATABASE || 'ExportFranklinStreet'

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  if (!mssqlServer) {
    console.error('❌ Missing MSSQL_SERVER in .env.local')
    process.exit(1)
  }

  const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${mssqlServer};Database=${mssqlDatabase};Trusted_Connection=yes;TrustServerCertificate=yes;`

  // Test SQL Server connection
  console.log(`🔌 Connecting to SQL Server: ${mssqlServer}/${mssqlDatabase}`)
  await querySQL(connectionString, 'SELECT 1 AS test')
  console.log('✅ Connected to SQL Server')

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, serviceKey)
  console.log('✅ Connected to Supabase')

  // Migrate each table
  const tables = Object.entries(TABLE_CONFIG)
  console.log(`\n🚀 Migrating ${tables.length} tables...\n`)

  for (const [tableName, config] of tables) {
    try {
      await migrateTable(connectionString, supabase, tableName, config)
    } catch (err) {
      console.error(`❌ Failed to migrate ${tableName}: ${err.message}`)
    }
  }

  console.log('\n🎉 Migration complete!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
