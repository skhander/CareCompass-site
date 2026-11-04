#!/usr/bin/env node
/**
 * MediGo PRD v2 — synthetic catalog generator.
 * All clinic/doctor/price/sentiment content is invented for product design demo.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Flat checkout: SITE = CareCompass-site. AgentStore: SITE = docs/site → ROOT = docs/.
const SITE = join(__dirname, '..');
const ROOT = join(SITE, '..');
const NOW = '2026-10-31';

const procedures = [
  {
    id: 'proc_hair_transplant',
    name: 'Hair transplant',
    slug: 'hair-transplant',
    category: 'Aesthetics',
    // Homepage Popular procedures tile only (not A–Z / entity pages)
    home_tile_name: 'Hair Transplants',
    home_tile_meta: 'From $1,800',
    popular: true,
    description:
      'Follicular unit extraction (FUE) and related graft techniques that relocate donor hair to thinning or bald areas. Often packaged with hotel stay and airport transfers in high-volume hubs.',
    process_recovery_timeline:
      'Consult and graft plan → procedure day (4–8h typical) → mild swelling 2–5 days → scabs shed ~10–14 days → visible growth often months 3–6 → denser results by 9–12 months. Confirm protocol with the surgical team.',
    before_after_notes: 'Synthetic silhouette placeholders only — not clinical photography.',
  },
  {
    id: 'proc_rhinoplasty',
    name: 'Rhinoplasty',
    slug: 'rhinoplasty',
    category: 'Plastic surgery',
    // Homepage Popular procedures tile only (not A–Z / entity pages)
    home_tile_name: 'Rhinoplasty',
    home_tile_meta: 'From $2,150',
    popular: true,
    description:
      'Surgery to reshape the nose for appearance and/or breathing. Approaches range from tip refinement to structural grafts; revision cases need extra planning.',
    process_recovery_timeline:
      'Imaging consult → surgery → external splint often ~1 week → bruising commonly softens over 1–2 weeks → residual swelling can take months. Follow surgeon aftercare.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_blepharoplasty',
    name: 'Eyelid surgery',
    slug: 'eyelid-surgery',
    category: 'Plastic surgery',
    // Homepage Popular procedures tile only (not A–Z / entity pages)
    home_tile_name: 'Eyelid Surgery',
    home_tile_meta: 'From $1,200',
    popular: true,
    description:
      'Upper and/or lower eyelid procedures (including double-eyelid approaches common in East Asia) to address hooding, fat pads, or crease definition.',
    process_recovery_timeline:
      'Often outpatient → bruising/swelling early → many resume light activity in 1–2 weeks per surgeon guidance → scar maturation continues longer.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_tummy_tuck',
    name: 'Tummy tuck',
    slug: 'tummy-tuck',
    category: 'Plastic surgery',
    popular: false,
    description:
      'Abdominoplasty to tighten abdominal wall and remove excess skin after pregnancy or weight change. May combine with liposuction when indicated.',
    process_recovery_timeline:
      'Surgery → drains sometimes used briefly → walking early → desk work often 2–3 weeks → exercise later per surgeon → full settling months.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_facelift',
    name: 'Facelift',
    slug: 'facelift',
    category: 'Plastic surgery',
    popular: false,
    description:
      'Surgical facial rejuvenation (SMAS / deep-plane variants where offered). Technique and incision plan vary widely — verify credentials case by case.',
    process_recovery_timeline:
      'Surgery → significant early swelling → social downtime often weeks → final contour settles over months.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_dental_implants',
    name: 'Dental implants',
    slug: 'dental-implants',
    category: 'Dental',
    // Homepage Popular procedures tile only (not A–Z / entity pages)
    home_tile_name: 'Dental Implants',
    home_tile_meta: 'From $700',
    popular: true,
    description:
      'Titanium (or zirconia) fixtures placed in jawbone to support crowns or bridges. All-on-X full-arch packages are common for medical travelers.',
    process_recovery_timeline:
      'Exam and imaging → placement → osseointegration weeks to months → final prosthesis → hygiene follow-up. Staged visits sometimes required.',
    before_after_notes: 'Synthetic smile-arch placeholders only.',
  },
  {
    id: 'proc_smile_makeover',
    name: 'Smile makeover',
    slug: 'smile-makeover',
    category: 'Dental',
    popular: false,
    description:
      'Coordinated veneers, whitening, and restorative work planned for a full smile redesign. Scope and material choices drive cost and longevity.',
    process_recovery_timeline:
      'Digital smile design → prep appointments → temporary restorations → final cementation → bite adjustments as needed.',
    before_after_notes: 'Synthetic smile placeholders only.',
  },
  {
    id: 'proc_ivf',
    name: 'IVF',
    slug: 'ivf',
    category: 'Fertility',
    // Homepage Popular procedures tile only (not A–Z / entity pages)
    home_tile_name: 'IVF',
    home_tile_meta: 'From $2,500',
    popular: true,
    description:
      'In vitro fertilization cycles including stimulation, retrieval, lab culture, and transfer. Legal frameworks and donor options differ by country.',
    process_recovery_timeline:
      'Workup → stimulation ~10–14 days → retrieval → embryo culture → transfer → pregnancy test ~9–14 days later. Multiple cycles may be planned.',
    before_after_notes: 'No clinical imagery — process timeline graphics only.',
  },
  {
    id: 'proc_breast_augmentation',
    name: 'Breast augmentation',
    slug: 'breast-augmentation',
    category: 'Plastic surgery',
    popular: false,
    description:
      'Implant or fat-transfer breast enhancement. Implant brand, plane, and sizing consults matter for travelers coordinating follow-up abroad.',
    process_recovery_timeline:
      'Consult → surgery → supportive garments → desk work often 1–2 weeks → heavier lifting later per surgeon.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_liposuction',
    name: 'Liposuction',
    slug: 'liposuction',
    category: 'Plastic surgery',
    popular: false,
    description:
      'Body-contouring fat removal from selected areas. Not a weight-loss procedure; compression and lymphatic care affect early results.',
    process_recovery_timeline:
      'Outpatient or short stay → compression weeks → walking early → exercise ramp per surgeon → swelling can linger months.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_bariatric',
    name: 'Gastric sleeve',
    slug: 'gastric-sleeve',
    category: 'Bariatric',
    popular: false,
    description:
      'Sleeve gastrectomy for medically indicated weight management. Requires nutrition counseling and lifelong follow-up planning.',
    process_recovery_timeline:
      'Clearance labs → laparoscopic surgery → liquid/puree phases → soft foods → solid diet over weeks → long-term vitamin protocol.',
    before_after_notes: 'Synthetic placeholders only — not clinical photography.',
  },
  {
    id: 'proc_lasik',
    name: 'LASIK',
    slug: 'lasik',
    category: 'Eye',
    popular: false,
    description:
      'Laser vision correction for eligible refractive errors. Screening for corneal thickness and dry eye is essential before travel.',
    process_recovery_timeline:
      'Screening → same-day procedure → protective drops → many resume desk work in 1–3 days → vision stabilizes over weeks.',
    before_after_notes: 'Abstract eye-mark placeholders only.',
  },
  {
    id: 'proc_cardiac',
    name: 'Cardiac bypass',
    slug: 'cardiac-bypass',
    category: 'Cardiac',
    popular: false,
    description:
      'Coronary artery bypass grafting (CABG) for indicated coronary disease. International pathways need full records transfer and cardiology clearance.',
    process_recovery_timeline:
      'Workup and imaging → surgery → ICU → step-down → cardiac rehab planning → travel-home clearance per surgical team (often weeks).',
    before_after_notes: 'No before/after photography — pathway timeline only.',
  },
  {
    id: 'proc_knee',
    name: 'Knee replacement',
    slug: 'knee-replacement',
    category: 'Orthopedics',
    popular: false,
    description:
      'Total or partial knee arthroplasty for advanced arthritis. Implant brand and physio access after return home should be planned early.',
    process_recovery_timeline:
      'Clearance → surgery → early mobilization → inpatient or hotel physio → progressive walking weeks → full recovery months.',
    before_after_notes: 'Joint diagram placeholders only.',
  },
  {
    id: 'proc_jaw',
    name: 'Jaw contouring',
    slug: 'jaw-contouring',
    category: 'Plastic surgery',
    popular: false,
    description:
      'Lower-face contouring (soft tissue and/or bony reduction). Naming and technique bundles differ by clinic — verify the exact plan.',
    process_recovery_timeline:
      'Depends on bony vs soft-tissue plan → swelling often significant early → diet modifications → settling over months.',
    before_after_notes: 'Synthetic silhouette placeholders only.',
  },
  {
    id: 'proc_injectables',
    name: 'Injectables',
    slug: 'injectables',
    category: 'Dermatology',
    // Homepage Popular procedures tile only (not A–Z / entity pages)
    home_tile_name: 'Injectables',
    home_tile_meta: 'From $150',
    popular: true,
    description:
      'Neuromodulators and dermal fillers for facial balancing. Product brands and injector training vary — ask what is used and who injects.',
    process_recovery_timeline:
      'Usually same-day → mild swelling/bruising possible → routine activity resumes quickly with aftercare.',
    before_after_notes: 'Synthetic placeholders only.',
  },
  {
    id: 'proc_oncology',
    name: 'Oncology care pathway',
    slug: 'oncology-care',
    category: 'Oncology',
    popular: false,
    description:
      'Coordinated oncology evaluation and treatment planning packages (imaging, MDT review, surgery or systemic therapy as indicated). Not a substitute for local oncology continuity.',
    process_recovery_timeline:
      'Records transfer → staging workup → multidisciplinary plan → treatment phase → survivorship handoff to home clinicians.',
    before_after_notes: 'No clinical photography — pathway graphics only.',
  },
  {
    id: 'proc_hip',
    name: 'Hip replacement',
    slug: 'hip-replacement',
    category: 'Orthopedics',
    popular: false,
    description:
      'Total hip arthroplasty for advanced joint disease. Approach (anterior/posterior) and implant choice should be confirmed in writing.',
    process_recovery_timeline:
      'Clearance → surgery → early walk → physio → travel clearance often after several weeks per team.',
    before_after_notes: 'Joint diagram placeholders only.',
  },
];

const hubs = [
  {
    id: 'dest_istanbul',
    name: 'Istanbul',
    slug: 'istanbul',
    country: 'Türkiye',
    city: 'Istanbul',
    featured: true,
    specialties: ['Aesthetics', 'Hair', 'Dental', 'Plastic surgery'],
    focus: 'Aesthetics, hair, dental, and broad specialty care',
    topProcedureIds: ['proc_hair_transplant', 'proc_rhinoplasty', 'proc_dental_implants', 'proc_tummy_tuck', 'proc_breast_augmentation'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Türkiye scores competitively on physician density among upper-middle-income peers in demo benchmarks; Istanbul hosts high procedure volume for aesthetics and hair restoration. Treat figures as illustrative demo data, not official WHO extracts.',
    culture_safety_tourism:
      'Straddles Europe and Asia with dense historic districts, Bosphorus ferries, and a large hospitality sector accustomed to medical travelers. Use current travel advisories; neighborhoods and clinic districts vary in walkability.',
    flight_time: '~10–13h from US East Coast (1-stop common); West Coast longer.',
    visa_requirements: 'Many US passports use e-Visa when eligible — confirm on official Republic of Türkiye e-Visa pages before travel.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_hair_transplant: [2200, 4500],
      proc_rhinoplasty: [2800, 5500],
      proc_dental_implants: [700, 1600],
      proc_tummy_tuck: [3500, 7000],
      proc_breast_augmentation: [3200, 6200],
    },
  },
  {
    id: 'dest_seoul',
    name: 'Seoul',
    slug: 'seoul',
    country: 'South Korea',
    city: 'Seoul',
    featured: true,
    specialties: ['Dermatology', 'Plastic surgery'],
    focus: 'Dermatology and plastic surgery (destination-first for skincare)',
    topProcedureIds: ['proc_blepharoplasty', 'proc_rhinoplasty', 'proc_jaw', 'proc_injectables', 'proc_facelift'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Republic of Korea ranks near the top of demo peer sets for life expectancy and hospital bed density; Seoul’s Gangnam corridor concentrates aesthetic capacity. Illustrative only.',
    culture_safety_tourism:
      'Global city with excellent transit, late-night food culture, and a dense Gangnam clinic district. Skincare travelers often start with destination browsing before locking a procedure.',
    flight_time: '~12–14h+ from US West Coast (1-stop common); East Coast usually longer.',
    visa_requirements: 'Many short-stay tourists may enter visa-free or under K-ETA when eligible — confirm on official K-ETA / immigration pages.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_blepharoplasty: [1800, 4200],
      proc_rhinoplasty: [3500, 8500],
      proc_jaw: [5000, 12000],
      proc_injectables: [200, 900],
      proc_facelift: [7000, 16000],
    },
  },
  {
    id: 'dest_bangkok',
    name: 'Bangkok',
    slug: 'bangkok',
    country: 'Thailand',
    city: 'Bangkok',
    featured: true,
    specialties: ['Cosmetic', 'Dental', 'Fertility', 'Hair', 'Multispecialty'],
    focus: 'Cosmetic, dental, fertility, hair, and multispecialty hospitals',
    topProcedureIds: ['proc_dental_implants', 'proc_ivf', 'proc_rhinoplasty', 'proc_breast_augmentation', 'proc_lasik', 'proc_hair_transplant'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Thailand’s medical tourism hospitals often advertise JCI-style accreditation in demo copy; Bangkok anchors private multispecialty capacity. Illustrative benchmarks only.',
    culture_safety_tourism:
      'Warm climate, temple and river tourism, and English-friendly private hospitals. Plan traffic time between hotel and clinic; rainy season affects outdoor plans.',
    flight_time: '~17–22h from US coasts with 1–2 stops typical.',
    visa_requirements: 'Many nationalities use visa exemption or VOA rules that change — confirm on official Thai immigration guidance.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_dental_implants: [800, 1800],
      proc_ivf: [4500, 9000],
      proc_rhinoplasty: [3000, 6500],
      proc_breast_augmentation: [3500, 7000],
      proc_lasik: [1200, 2800],
      proc_hair_transplant: [2400, 4800],
    },
  },
  {
    id: 'dest_tijuana',
    name: 'Tijuana',
    slug: 'tijuana',
    country: 'Mexico',
    city: 'Tijuana',
    featured: true,
    specialties: ['Dental', 'Cosmetic', 'Bariatric', 'Hair'],
    focus: 'Dental, cosmetic, bariatric, and hair care near the US border',
    topProcedureIds: ['proc_dental_implants', 'proc_bariatric', 'proc_smile_makeover', 'proc_tummy_tuck', 'proc_liposuction', 'proc_hair_transplant'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Mexico’s border cities serve high volumes of US dental and bariatric travelers in demo narratives; verify COFEPRIS licensing per facility. Illustrative only.',
    culture_safety_tourism:
      'Immediate access from San Diego for many travelers; medical corridors concentrate near border crossings. Follow current safety advisories and clinic transport guidance.',
    flight_time: 'Drive/transit from Southern California common; flights into SAN + ground transfer typical.',
    visa_requirements: 'US citizens generally enter Mexico for tourism with passport — confirm stay purpose and any FMM requirements.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_dental_implants: [600, 1400],
      proc_bariatric: [4500, 8500],
      proc_smile_makeover: [2500, 7000],
      proc_tummy_tuck: [3200, 6500],
      proc_liposuction: [2200, 5000],
      proc_hair_transplant: [2100, 4200],
    },
  },
  {
    id: 'dest_mexico_city',
    name: 'Mexico City',
    slug: 'mexico-city',
    country: 'Mexico',
    city: 'Mexico City',
    featured: true,
    specialties: ['Cosmetic', 'Dental', 'Eye', 'Hair', 'Hospital'],
    focus: 'Cosmetic, dental, eye care, hair, and full hospitals',
    topProcedureIds: ['proc_lasik', 'proc_dental_implants', 'proc_rhinoplasty', 'proc_breast_augmentation', 'proc_facelift', 'proc_hair_transplant'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: CDMX private hospitals in this demo show strong specialty breadth (ophthalmology through plastics); national health metrics vary sharply public vs private. Illustrative.',
    culture_safety_tourism:
      'World-class museums, food, and altitude (~2,200m) — discuss altitude with your clinician for early postop plans. Use trusted transport between hotel and clinic.',
    flight_time: '~3.5–5.5h nonstop from many US hubs.',
    visa_requirements: 'US citizens generally enter for tourism with passport — confirm official rules for your stay length.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_lasik: [900, 2200],
      proc_dental_implants: [650, 1500],
      proc_rhinoplasty: [2800, 5800],
      proc_breast_augmentation: [3000, 6000],
      proc_facelift: [5500, 12000],
      proc_hair_transplant: [2300, 4600],
    },
  },
  {
    id: 'dest_medellin',
    name: 'Medellín',
    slug: 'medellin',
    country: 'Colombia',
    city: 'Medellín',
    featured: false,
    specialties: ['Cosmetic', 'Hair', 'Multidisciplinary'],
    focus: 'Cosmetic surgery, hair restoration, and multidisciplinary support',
    topProcedureIds: ['proc_tummy_tuck', 'proc_breast_augmentation', 'proc_rhinoplasty', 'proc_liposuction', 'proc_facelift', 'proc_hair_transplant'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Colombia’s private aesthetic hubs (Medellín, Bogotá) show rising international volume in demo datasets; plastic surgery societies are active. Illustrative only.',
    culture_safety_tourism:
      'Spring-like climate, metro cable cars, and neighborhood tourism (El Poblado / Laureles). Confirm recovery lodging near your clinic; follow current advisories.',
    flight_time: '~5–8h from US hubs with nonstop or 1-stop options.',
    visa_requirements: 'Many US travelers enter visa-free for short tourism stays — confirm migration Colombia guidance.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_tummy_tuck: [3000, 6200],
      proc_breast_augmentation: [2800, 5500],
      proc_rhinoplasty: [2500, 5200],
      proc_liposuction: [2000, 4500],
      proc_facelift: [5000, 11000],
      proc_hair_transplant: [2000, 4300],
    },
  },
  {
    id: 'dest_san_jose',
    name: 'San José',
    slug: 'san-jose',
    country: 'Costa Rica',
    city: 'San José',
    featured: false,
    specialties: ['Dental', 'Cosmetic', 'Orthopedics'],
    focus: 'Dental, cosmetic, and orthopedic care',
    topProcedureIds: ['proc_dental_implants', 'proc_knee', 'proc_hip', 'proc_smile_makeover', 'proc_rhinoplasty'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Costa Rica’s demo profile highlights strong primary care indicators and bilingual private dental/ortho centers serving North American travelers. Illustrative.',
    culture_safety_tourism:
      'Gateway to volcano and cloud-forest tourism; many patients combine recovery days with gentle eco-travel. Rainy season planning helps.',
    flight_time: '~3–6h from major US hubs.',
    visa_requirements: 'US citizens often enter visa-free for tourism for limited stays — confirm official migration rules.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_dental_implants: [750, 1700],
      proc_knee: [9000, 16000],
      proc_hip: [9500, 17000],
      proc_smile_makeover: [2800, 7500],
      proc_rhinoplasty: [3200, 6000],
    },
  },
  {
    id: 'dest_delhi',
    name: 'Delhi',
    slug: 'delhi',
    country: 'India',
    city: 'New Delhi',
    featured: true,
    specialties: ['Cardiac', 'Orthopedics', 'Oncology', 'Cosmetic', 'Dental', 'Fertility'],
    focus: 'Cardiac, ortho, cancer, cosmetic, dental, and fertility',
    topProcedureIds: ['proc_cardiac', 'proc_oncology', 'proc_knee', 'proc_ivf', 'proc_dental_implants', 'proc_rhinoplasty'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: India’s large tertiary centers publish high procedure volumes for cardiac and oncology care in demo narratives; NABH/JCI-style badges appear often in private marketing. Illustrative only.',
    culture_safety_tourism:
      'National capital region with major tertiary hospitals and medical coordinators. Air quality and traffic affect recovery logistics — plan lodging near the hospital campus.',
    flight_time: '~14–18h+ from US with 1–2 stops typical.',
    visa_requirements: 'Most travelers need an e-Visa or visa in advance — confirm on official Indian visa portals for medical visit categories.',
    healthcare_subsidised: false,
    avg_costs: {
      proc_cardiac: [5500, 12000],
      proc_oncology: [4000, 18000],
      proc_knee: [4500, 9000],
      proc_ivf: [2500, 5500],
      proc_dental_implants: [400, 1100],
      proc_rhinoplasty: [2200, 4800],
    },
  },
  {
    id: 'dest_barcelona',
    name: 'Barcelona',
    slug: 'barcelona',
    country: 'Spain',
    city: 'Barcelona',
    featured: false,
    specialties: ['Fertility', 'IVF'],
    focus: 'Fertility and IVF',
    topProcedureIds: ['proc_ivf'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Spain ranks highly on demo European health-system access metrics; Barcelona fertility clinics are a known EU destination for international IVF. Illustrative benchmarks.',
    culture_safety_tourism:
      'Walkable Mediterranean city with strong public transit. EU patient-rights frameworks apply differently to non-residents — ask clinics about legal limits on anonymous donation and storage.',
    flight_time: '~7–10h from US East Coast (nonstop or 1-stop); West Coast longer.',
    visa_requirements: 'US citizens typically enter Schengen visa-free for short stays — confirm current ETIAS / Schengen rules.',
    healthcare_subsidised: true,
    avg_costs: {
      proc_ivf: [4500, 8500],
    },
  },
  {
    id: 'dest_prague',
    name: 'Prague',
    slug: 'prague',
    country: 'Czechia',
    city: 'Prague',
    featured: false,
    specialties: ['Fertility', 'IVF'],
    focus: 'Fertility and IVF',
    topProcedureIds: ['proc_ivf'],
    who_reputation_notes:
      'Synthetic WHO-style snapshot: Czechia’s demo fertility sector shows competitive EU lab standards and transparent package pricing versus Western Europe. Illustrative only.',
    culture_safety_tourism:
      'Compact historic core, efficient transit, and English-friendly clinics. Good for short IVF monitoring trips with city-break recovery days.',
    flight_time: '~8–11h from US East Coast with 1 stop typical.',
    visa_requirements: 'US citizens typically enter Schengen visa-free for short stays — confirm current ETIAS / Schengen rules.',
    healthcare_subsidised: true,
    avg_costs: {
      proc_ivf: [3200, 6500],
    },
  },
];

/** Synthetic clinic blueprints per hub (invented names). */
const clinicBlueprints = {
  dest_istanbul: [
    { name: 'Bosphorus Follicle Institute', focus: 'Hair transplant', procs: ['proc_hair_transplant'], accent: '#953363' },
    { name: 'Galata Contour Surgery', focus: 'Plastic surgery', procs: ['proc_rhinoplasty', 'proc_tummy_tuck', 'proc_breast_augmentation'] },
    { name: 'Golden Horn Dental Atelier', focus: 'Dental', procs: ['proc_dental_implants', 'proc_smile_makeover'] },
    { name: 'Marmara Aesthetic Hospital', focus: 'Multispecialty aesthetics', procs: ['proc_hair_transplant', 'proc_rhinoplasty', 'proc_liposuction', 'proc_facelift'] },
    // Synthetic hair-transplant demo clinics (invented — not real facilities)
    { name: 'Kadikoy Graft Atelier', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
    { name: 'Besiktas Follicle Lab', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
    { name: 'Cengelkoy Hair Pavilion', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
    { name: 'Ortakoy Density Works', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
  ],
  dest_seoul: [
    { name: 'Cheongdam Lumen Plastic', focus: 'Plastic surgery', procs: ['proc_rhinoplasty', 'proc_blepharoplasty', 'proc_jaw', 'proc_facelift'] },
    { name: 'Gangnam Pore & Glow Derm', focus: 'Dermatology', procs: ['proc_injectables', 'proc_blepharoplasty'] },
    { name: 'Apgujeong Vector Surgery', focus: 'Facial contour', procs: ['proc_jaw', 'proc_rhinoplasty', 'proc_blepharoplasty'] },
    { name: 'Hannam SoftLift Clinic', focus: 'Rejuvenation', procs: ['proc_facelift', 'proc_injectables', 'proc_blepharoplasty'] },
  ],
  dest_bangkok: [
    { name: 'Chao Phraya Multicare Hospital', focus: 'Multispecialty', procs: ['proc_ivf', 'proc_lasik', 'proc_dental_implants', 'proc_rhinoplasty'] },
    { name: 'Sukhumvit Smile Lab', focus: 'Dental', procs: ['proc_dental_implants', 'proc_smile_makeover'] },
    { name: 'Silom Fertility Pavilion', focus: 'Fertility', procs: ['proc_ivf'] },
    { name: 'Riverside Contour Center', focus: 'Cosmetic', procs: ['proc_breast_augmentation', 'proc_rhinoplasty', 'proc_liposuction'] },
    { name: 'Thonglor Follicle House', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
    { name: 'Asok Crown Restoration', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
  ],
  dest_tijuana: [
    { name: 'Zona Río Dental Bridge', focus: 'Dental', procs: ['proc_dental_implants', 'proc_smile_makeover'] },
    { name: 'Otay Metabolic Surgery', focus: 'Bariatric', procs: ['proc_bariatric'] },
    { name: 'Playas Form Clinic', focus: 'Cosmetic', procs: ['proc_tummy_tuck', 'proc_liposuction', 'proc_breast_augmentation'] },
    { name: 'Agua Caliente Graft Institute', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
    { name: 'Hipodromo Follicle Hub', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
  ],
  dest_mexico_city: [
    { name: 'Polanco Vision Works', focus: 'Eye', procs: ['proc_lasik'] },
    { name: 'Roma Norte Dental Atelier', focus: 'Dental', procs: ['proc_dental_implants', 'proc_smile_makeover'] },
    { name: 'Insurgentes Aesthetic Pavilion', focus: 'Cosmetic', procs: ['proc_rhinoplasty', 'proc_facelift', 'proc_breast_augmentation'] },
    { name: 'Pedregal Care Hospital', focus: 'Hospital', procs: ['proc_lasik', 'proc_rhinoplasty', 'proc_dental_implants'] },
    { name: 'Condesa Follicle Atelier', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
  ],
  dest_medellin: [
    { name: 'El Poblado Form Studio', focus: 'Cosmetic', procs: ['proc_tummy_tuck', 'proc_liposuction', 'proc_breast_augmentation'] },
    { name: 'Laureles Profile Surgery', focus: 'Facial', procs: ['proc_rhinoplasty', 'proc_facelift'] },
    { name: 'Provenza Multidisciplinary Care', focus: 'Multidisciplinary', procs: ['proc_tummy_tuck', 'proc_breast_augmentation', 'proc_liposuction', 'proc_rhinoplasty'] },
    { name: 'Envigado Graft Pavilion', focus: 'Hair transplant', procs: ['proc_hair_transplant'] },
  ],
  dest_san_jose: [
    { name: 'Escazú Dental Highlands', focus: 'Dental', procs: ['proc_dental_implants', 'proc_smile_makeover'] },
    { name: 'Sabana Ortho Institute', focus: 'Orthopedics', procs: ['proc_knee', 'proc_hip'] },
    { name: 'Barrio Amón Contour', focus: 'Cosmetic', procs: ['proc_rhinoplasty', 'proc_breast_augmentation'] },
  ],
  dest_delhi: [
    { name: 'Lotus Tertiary Heart Center', focus: 'Cardiac', procs: ['proc_cardiac'] },
    { name: 'Yamuna Oncology Collective', focus: 'Oncology', procs: ['proc_oncology'] },
    { name: 'Connaught Joint Institute', focus: 'Orthopedics', procs: ['proc_knee', 'proc_hip'] },
    { name: 'Defence Colony Fertility Lab', focus: 'Fertility', procs: ['proc_ivf'] },
    { name: 'Hauz Khas Smile & Face', focus: 'Dental & cosmetic', procs: ['proc_dental_implants', 'proc_rhinoplasty'] },
  ],
  dest_barcelona: [
    { name: 'Eixample Fertility Atelier', focus: 'IVF', procs: ['proc_ivf'] },
    { name: 'Diagonal Reproductive Medicine', focus: 'IVF', procs: ['proc_ivf'] },
    { name: 'Gràcia Embryo Lab', focus: 'IVF', procs: ['proc_ivf'] },
  ],
  dest_prague: [
    { name: 'Vinohrady Fertility House', focus: 'IVF', procs: ['proc_ivf'] },
    { name: 'Karlín Reproductive Clinic', focus: 'IVF', procs: ['proc_ivf'] },
    { name: 'Letná IVF Pavilion', focus: 'IVF', procs: ['proc_ivf'] },
  ],
};

const doctorFirst = [
  'Amira', 'Kenji', 'Sofia', 'Mateo', 'Hana', 'Omar', 'Elena', 'Priya', 'Luca', 'Yuri',
  'Nadia', 'Carlos', 'Ines', 'Arjun', 'Mila', 'Diego', 'Sora', 'Leila', 'Tomas', 'Ayla',
];
const doctorLast = [
  'Okada', 'Reyes', 'Novak', 'Hassan', 'Petrov', 'Singh', 'Moreau', 'Kim', 'Silva', 'Costa',
  'Nakamura', 'Vargas', 'Horvath', 'Demir', 'Park', 'Almeida', 'Cho', 'Ibrahim', 'Nováková', 'García',
];

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sentimentFor(entityType, name, focus) {
  const themes = [
    { theme: 'Coordinator responsiveness', tone: 'positive', weight: 0.72 },
    { theme: 'Wait times on arrival day', tone: 'mixed', weight: 0.54 },
    { theme: 'Hotel–clinic transfer clarity', tone: 'positive', weight: 0.61 },
    { theme: 'Aftercare instructions in English', tone: 'mixed', weight: 0.48 },
    { theme: 'Perceived value vs US quotes', tone: 'positive', weight: 0.69 },
  ];
  return {
    id: `sent_${entityType}_${slugify(name).slice(0, 40)}`,
    entity_type: entityType,
    summary: `Illustrative demo sentiment for ${name} (${focus}). Themes are synthesized from public-style social post patterns — not live scrapes. Labeled for product design only.`,
    themes: themes.slice(0, 3 + (name.length % 3)),
    confidence: 'low',
    sample_links: [
      { label: 'Example public forum thread (placeholder)', url: '#' },
      { label: 'Example short-video caption corpus (placeholder)', url: '#' },
    ],
    date_seen: NOW,
    source_notes: 'Synthetic. Do not treat as real patient reviews.',
    labeled: 'illustrative/demo from public-style posts',
  };
}

function priceRange(hub, procId, clinicIndex) {
  const base = hub.avg_costs[procId] || [2000, 5000];
  const jitter = (clinicIndex % 3) * 150;
  return {
    min_usd: base[0] + jitter,
    max_usd: base[1] + jitter * 2,
    currency: 'USD',
    includes: 'Synthetic package sketch: consult, procedure, basic meds; hotel/transfers vary.',
    us_compare_min_usd: Math.round(base[0] * 2.4),
    us_compare_max_usd: Math.round(base[1] * 2.8),
    what_we_could_not_confirm: 'Demo ranges only — not clinic quotes.',
  };
}

const clinics = [];
const doctors = [];
const prices = [];
const sentiments = [];
const procedure_destinations = [];
const procedure_clinics = [];
const procedure_doctors = [];
const media = [];

let docIdx = 0;

for (const hub of hubs) {
  sentiments.push(sentimentFor('destination', hub.name, hub.focus));

  for (const procId of hub.topProcedureIds) {
    procedure_destinations.push({ procedure_id: procId, destination_id: hub.id });
    const pr = priceRange(hub, procId, 0);
    prices.push({
      id: `price_dest_${hub.slug}_${procId}`,
      entity_type: 'destination',
      entity_id: hub.id,
      procedure_id: procId,
      ...pr,
      source_url: null,
      date_seen: NOW,
    });
  }

  const blues = clinicBlueprints[hub.id] || [];
  blues.forEach((bp, i) => {
    const slug = slugify(bp.name);
    const id = `clinic_${hub.slug}_${slug}`.replace(/clinic_clinic_/, 'clinic_');
    const clinic = {
      id,
      name: bp.name,
      slug,
      destination_id: hub.id,
      focus: bp.focus,
      summary: `${bp.name} is a synthetic MediGo demo clinic in ${hub.name}, focused on ${bp.focus.toLowerCase()}. Invented for product design — not a real facility.`,
      accreditations: ['Demo accreditation badge', 'Synthetic ISO-style mark'],
      package_notes: 'Demo packages may list hotel nights and transfers; confirm nothing — data is fictional.',
      price_min_usd: null,
      price_max_usd: null,
      maps_place_id: null,
      street_view_url: null,
      map_placeholder: true,
      photo_placeholders: 3,
      source_url: null,
      what_we_found: 'Synthetic profile generated for PRD v2 demo.',
      what_we_could_not_confirm: 'Everything — fictional entity.',
      procedure_ids: bp.procs,
      created_at: NOW,
      updated_at: NOW,
    };
    clinics.push(clinic);
    sentiments.push(sentimentFor('clinic', bp.name, bp.focus));

    media.push({
      id: `media_${id}_facade`,
      entity_type: 'clinic',
      entity_id: id,
      kind: 'clinic_photo',
      url: `../assets/placeholders/clinic-${(i % 3) + 1}.svg`,
      attribution: 'Synthetic SVG placeholder',
      source_url: null,
    });
    media.push({
      id: `media_${id}_ba`,
      entity_type: 'clinic',
      entity_id: id,
      kind: 'before_after',
      url: `../assets/placeholders/before-after.svg`,
      attribution: 'Synthetic before/after placeholder — not clinical photography',
      source_url: null,
    });

    for (const procId of bp.procs) {
      procedure_clinics.push({ procedure_id: procId, clinic_id: id });
      const pr = priceRange(hub, procId, i + 1);
      if (clinic.price_min_usd == null || pr.min_usd < clinic.price_min_usd) clinic.price_min_usd = pr.min_usd;
      if (clinic.price_max_usd == null || pr.max_usd > clinic.price_max_usd) clinic.price_max_usd = pr.max_usd;
      prices.push({
        id: `price_${id}_${procId}`,
        entity_type: 'clinic',
        entity_id: id,
        procedure_id: procId,
        ...pr,
        source_url: null,
        date_seen: NOW,
      });
    }

    const nDocs = bp.procs.length > 2 ? 2 : 1;
    for (let d = 0; d < nDocs; d++) {
      const fn = doctorFirst[(docIdx + d) % doctorFirst.length];
      const ln = doctorLast[(docIdx * 3 + d) % doctorLast.length];
      const dname = `Dr. ${fn} ${ln}`;
      const dslug = slugify(`${fn}-${ln}-${hub.slug}`);
      const did = `doc_${dslug}`;
      const primaryProc = bp.procs[d % bp.procs.length];
      const doctor = {
        id: did,
        name: dname,
        slug: dslug,
        clinic_id: id,
        destination_id: hub.id,
        title: d === 0 ? 'Lead surgeon' : 'Associate clinician',
        credentials: `Synthetic board-style credentials for demo · ${bp.focus} · trained across multi-country fellowships (fictional).`,
        specialty: bp.focus,
        procedure_ids: bp.procs,
        what_we_found: 'Invented doctor profile for MediGo PRD v2.',
        what_we_could_not_confirm: 'All fields fictional.',
        source_url: null,
        created_at: NOW,
        updated_at: NOW,
      };
      doctors.push(doctor);
      for (const procId of bp.procs) {
        procedure_doctors.push({ procedure_id: procId, doctor_id: did });
      }
      sentiments.push(sentimentFor('doctor', dname, primaryProc));
    }
    docIdx += nDocs;
  });
}

// Destinations with procedure_ids
const destinations = hubs.map((h) => ({
  id: h.id,
  name: h.name,
  slug: h.slug,
  country: h.country,
  city: h.city,
  featured: h.featured,
  specialties: h.specialties,
  focus: h.focus,
  who_reputation_notes: h.who_reputation_notes,
  culture_safety_tourism: h.culture_safety_tourism,
  flight_time: h.flight_time,
  visa_requirements: h.visa_requirements,
  healthcare_subsidised: h.healthcare_subsidised,
  top_procedure_ids: h.topProcedureIds,
  procedure_ids: h.topProcedureIds,
  source_url: null,
  what_we_could_not_confirm: 'All destination intel is synthetic demo copy for product design.',
  created_at: NOW,
  updated_at: NOW,
}));

const procedureEntities = procedures.map((p) => ({
  ...p,
  worth_it: null,
  source_url: null,
  what_we_could_not_confirm: 'Synthetic clinical overview for demo — not medical advice.',
  created_at: NOW,
  updated_at: NOW,
}));

const entities = {
  version: 9,
  updated: NOW,
  synthetic: true,
  disclaimer:
    'All catalog content is synthetic LLM-generated demo data for MediGo product design. Not real clinics, doctors, prices, WHO extracts, or patient reviews. No marketplace scrapes.',
  wedge: {
    focus: 'PRD v2 hub destinations with synthetic procedure → destination → clinic → doctor graph',
    hubs: hubs.map((h) => h.slug),
    last_agent: 'prd-v2-synthetic-generator',
    notes: 'Bookimed-free. Seoul seed names optional inspiration only — clinics here are invented.',
  },
  procedures: procedureEntities,
  destinations,
  clinics,
  doctors,
  procedure_destinations,
  procedure_clinics,
  procedure_doctors,
  prices,
  sentiments,
  media,
};

const catalog = {
  version: 1,
  updated: NOW,
  synthetic: true,
  disclaimer: entities.disclaimer,
  meta: {
    hubs: destinations.length,
    procedures: procedureEntities.length,
    clinics: clinics.length,
    doctors: doctors.length,
  },
  procedures: procedureEntities.map((p) => ({
    ...p,
    destination_ids: procedure_destinations.filter((x) => x.procedure_id === p.id).map((x) => x.destination_id),
    clinic_ids: procedure_clinics.filter((x) => x.procedure_id === p.id).map((x) => x.clinic_id),
    doctor_ids: [...new Set(procedure_doctors.filter((x) => x.procedure_id === p.id).map((x) => x.doctor_id))],
    price_ranges: prices.filter((x) => x.procedure_id === p.id && x.entity_type === 'destination'),
  })),
  destinations: destinations.map((d) => ({
    ...d,
    clinic_ids: clinics.filter((c) => c.destination_id === d.id).map((c) => c.id),
    doctor_ids: doctors.filter((doc) => doc.destination_id === d.id).map((doc) => doc.id),
    price_ranges: prices.filter((x) => x.entity_id === d.id && x.entity_type === 'destination'),
  })),
  clinics: clinics.map((c) => ({
    ...c,
    doctor_ids: doctors.filter((d) => d.clinic_id === c.id).map((d) => d.id),
    price_ranges: prices.filter((x) => x.entity_id === c.id),
    sentiment: sentiments.find((s) => s.entity_type === 'clinic' && s.summary.includes(c.name)),
    media: media.filter((m) => m.entity_id === c.id),
  })),
  doctors: doctors.map((d) => ({
    ...d,
    clinic: clinics.find((c) => c.id === d.clinic_id),
    destination: destinations.find((x) => x.id === d.destination_id),
    sentiment: sentiments.find((s) => s.entity_type === 'doctor' && s.summary.includes(d.name)),
  })),
  prices,
  sentiments,
  search_index: [
    ...procedureEntities.map((p) => ({ type: 'procedure', id: p.id, slug: p.slug, name: p.name, href: `./procedures/${p.slug}.html`, category: p.category })),
    ...destinations.map((d) => ({ type: 'destination', id: d.id, slug: d.slug, name: `${d.name}, ${d.country}`, href: `./destinations/${d.slug}.html`, category: d.focus })),
    ...clinics.map((c) => {
      const dest = destinations.find((d) => d.id === c.destination_id);
      return { type: 'clinic', id: c.id, slug: c.slug, name: c.name, href: `./clinics/${c.slug}.html`, category: dest ? dest.name : c.focus };
    }),
    ...doctors.map((d) => ({ type: 'doctor', id: d.id, slug: d.slug, name: d.name, href: `./doctors/${d.slug}.html`, category: d.specialty })),
  ],
};

mkdirSync(join(SITE, 'data'), { recursive: true });
writeFileSync(join(SITE, 'data', 'catalog.json'), JSON.stringify(catalog, null, 2));
writeFileSync(join(SITE, 'data', 'entities.json'), JSON.stringify(entities, null, 2));
// AgentStore layout: also persist entities under docs/data/
if (SITE.endsWith(`${join('docs', 'site')}`) || /[/\\]docs[/\\]site$/.test(SITE)) {
  mkdirSync(join(ROOT, 'data'), { recursive: true });
  writeFileSync(join(ROOT, 'data', 'entities.json'), JSON.stringify(entities, null, 2));
}

console.log(
  JSON.stringify(
    {
      procedures: procedureEntities.length,
      destinations: destinations.length,
      clinics: clinics.length,
      doctors: doctors.length,
      prices: prices.length,
      sentiments: sentiments.length,
    },
    null,
    2
  )
);
