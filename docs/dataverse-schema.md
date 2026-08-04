# Dataverse Schema Documentation — Vehicle Pricing Intelligence Platform

> **Last updated:** 2026-07-21
> **Platform:** Microsoft Dataverse (Power Pages)

---

## Overview

The Vehicle Pricing Intelligence Platform uses Microsoft Dataverse as its long-term system of record for vehicle valuation, customer inquiries, and vehicle master data.

The solution now consists of five primary tables:

| Display Name | Logical Name | Purpose |
|---|---|---|
| Vehicle Data | `vpi_vehicledatas` | Stores vehicle master and pricing information |
| Contact | `contacts` | Stores customer information |
| Vehicle Inquiry | `vpi_vehicleinquiries` | Stores valuation requests and links customers to vehicles |
| Missing Vehicle Request | `vpi_missingvehiclerequests` | Records vehicles users searched for that don't exist in master data |
| Price Suggestion | `vpi_pricesuggestions` | Accumulates market-based pricing suggestions submitted by users |

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│      Contact        │
│      contacts       │
└─────────┬───────────┘
          │ 1
          │
          │
          │ N
┌─────────▼───────────┐
│  Vehicle Inquiry    │
│ vpi_vehicleinquiries│
└─────────┬───────────┘
          │ N
          │
          │
          │ 1
┌─────────▼───────────┐    1            N  ┌─────────────────────────┐
│    Vehicle Data     │─────────────────────│    Price Suggestion     │
│  vpi_vehicledatas   │                     │ vpi_pricesuggestions    │
└─────────────────────┘                     └─────────────────────────┘

┌──────────────────────────────┐
│  Missing Vehicle Request     │
│ vpi_missingvehiclerequests   │
└──────────────────────────────┘
```

**Relationships:**
- **Contact → Vehicle Inquiry**: One-to-Many (1:N) — One contact can create multiple vehicle inquiries
- **Vehicle Data → Vehicle Inquiry**: One-to-Many (1:N) — One vehicle can be referenced by multiple inquiries
- **Vehicle Data → Price Suggestion**: One-to-Many (1:N) — One vehicle can receive multiple pricing suggestions
- **Missing Vehicle Request**: Standalone table — captures searches for vehicles not yet in master data, no direct FK relationships

---

## Table 1: Vehicle Data (`vpi_vehicledatas`)

### Table Information

| Property | Value |
|---|---|
| Display Name | Vehicle Data |
| Logical Name | `vpi_vehicledatas` |
| Primary Key | `vpi_vehicledataid` (GUID) |
| Primary Name Column | `vpi_name` |

### System Fields

| Display Name | Logical Name | Type | Notes |
|---|---|---|---|
| Vehicle Data | `vpi_vehicledataid` | Unique Identifier (GUID) | Primary key |
| Name | `vpi_name` | Single Line Text | Set by the app when an MVR is approved — composite `Make Model Trim` (no Year), e.g. "Mercedes Benz C-Class C 200" |

### Identity & Classification Fields

| Display Name | Logical Name | Type |
|---|---|---|
| ID | `vpi_id` | Single Line Text |
| Make | `vpi_make` | Single Line Text |
| Make Code | `vpi_makecode` | Single Line Text |
| Model | `vpi_model` | Single Line Text |
| Model Code | `vpi_modelcode` | Single Line Text |
| Spec | `vpi_spec` | Single Line Text |
| Year | `vpi_year` | Single Line Text |
| Year Code | `vpi_yearcode` | Single Line Text |
| Description | `vpi_description` | Single Line Text |

### Vehicle Characteristics

| Display Name | Logical Name | Type |
|---|---|---|
| Engine Size | `vpi_enginesize` | Decimal |
| Horsepower | `vpi_horsepower` | Whole Number |
| Cylinders | `vpi_cylinders` | Whole Number |

### Pricing Fields

| Display Name | Logical Name | Type |
|---|---|---|
| Min Price | `vpi_minprice` | Currency |
| Avg Price | `vpi_avgprice` | Currency |
| Max Price | `vpi_maxprice` | Currency |
| Price Spread % | `vpi_pricespreadpct` | Decimal |

#### Currency Base Fields (auto-maintained by Dataverse)

| Display Name | Logical Name | Usage |
|---|---|---|
| Min Price (Base) | `vpi_minprice_base` | Not used by application |
| Avg Price (Base) | `vpi_avgprice_base` | Not used by application |
| Max Price (Base) | `vpi_maxprice_base` | Not used by application |

### Choice Fields

#### Body Type (`vpi_bodytype`)

> ⚠️ **VERIFIED 2026-07-31** against the actual Dataverse option set — 68 options. The previous table here was FABRICATED (Sedan=46, SUV=55, plus labels like "Landaulet"/"Minivan"/"Panelvan Wide Body High Roof" that don't exist). Labels were cleaned in Dataverse on 2026-07-31 to match the MVR set exactly (uppercase `LWB`, uniform ` - ` separator for the SUV subtypes) — labels AND values are now identical to the [Missing Vehicle Body Type](#body-type-vpi_bodytype-1) set.

| Label | Value |
|---|---|
| Bus | 1 |
| Cargo | 2 |
| Cargo Van | 3 |
| Cargo Van High Roof | 4 |
| Compact/Mini MPV | 5 |
| Convertible | 6 |
| Coupe | 7 |
| Coupe/Cabriolet | 8 |
| Crew Cab | 9 |
| Crossbow | 10 |
| Crossover Fastback | 11 |
| Estate | 12 |
| Half Panel Van | 13 |
| Hard Top | 14 |
| Hatchback | 15 |
| Limousine | 16 |
| Long Cargo | 17 |
| Long Van | 18 |
| LWB HR Van | 19 |
| LWB Low Roof Van | 20 |
| LWB Van | 21 |
| Mini Bus | 22 |
| Mini Bus High Roof | 23 |
| Mini Bus LWB | 24 |
| Mini Bus LWB Wide Body HR | 25 |
| Mini Bus Semi High Roof | 26 |
| Mini Van | 27 |
| MPV | 28 |
| Open Top | 29 |
| Panel Van | 30 |
| Panel Van High Roof | 31 |
| Panel Van Wide Body High Roof | 32 |
| Pick Up | 33 |
| Pick Up Double Cab Long Box | 34 |
| Pick Up Ext Cab | 35 |
| Pick Up Ext Cab Long Box | 36 |
| Pick Up Long Box | 37 |
| Pick Up LWB | 38 |
| Pick Up Single Cab | 39 |
| Pick Up Truck | 40 |
| Regular Cab | 41 |
| Regular Cab Chassis | 42 |
| Retractable Hard Top | 43 |
| Sedan | 44 |
| Short Van | 45 |
| Single Cabin Long Cargo | 46 |
| Single Cabin Long Chassis | 47 |
| Single Cabin Std Cargo | 48 |
| Single Cabin Std Chassis | 49 |
| Soft Top | 50 |
| Sportback | 51 |
| Station | 52 |
| SUV | 53 |
| SUV - Compact | 54 |
| SUV - Convertible | 55 |
| SUV - Coupe | 56 |
| SUV - Crossover | 57 |
| SWB Van | 58 |
| Targa | 59 |
| Truck | 60 |
| Van | 61 |
| Van 3.5 Ton | 62 |
| Van 4.5 Ton | 63 |
| Wagon | 64 |
| Wide Body Mini Bus | 65 |
| Wide Body Van | 66 |
| Window Van | 67 |
| Pick Up Double Cab | 68 |

> **Usage:** Vehicle filtering, search, categorization, analytics segmentation, valuation grouping.

#### Category (`vpi_category`)

| Label | Value |
|---|---|
| GCC | 1 |
| NON-GCC | 2 |
| OTHER/STANDARD | 3 |

> Indicates regional specification classification.

#### Transmission (`vpi_transmissiontronic`)

| Label | Value |
|---|---|
| 9G-Tronic | 1 |
| Active Select | 2 |
| Automatic | 3 |
| CVT | 4 |
| CVT + Manual Mode | 5 |
| DHT | 6 |
| Direct Drive | 7 |
| Drivelogic | 8 |
| Dual Clutch | 9 |
| E-CVT | 10 |
| E-Gear | 11 |
| F1 | 12 |
| F1 DC | 13 |
| F1A | 14 |
| Geartronic | 15 |
| Hydramatic | 16 |
| Manual | 17 |
| Multimode | 18 |
| Multitronic | 19 |
| PDK | 20 |
| PHEV | 21 |
| Powershift | 22 |
| Quickshift | 23 |
| R-Tronic | 24 |
| Selespeed | 25 |
| Sentronic | 26 |
| Sequential | 27 |
| SMG | 28 |
| Sport Mode | 29 |
| S-Tronic | 30 |
| Touchtronic | 31 |

#### Doors (`vpi_doors`)

| Label | Value |
|---|---|
| 0 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 1 DOOR | 7 |

#### Seats (`vpi_seats`)

| Label | Value |
|---|---|
| 2 | 1 |
| 3 | 2 |
| 4 | 3 |
| 5 | 4 |
| 6 | 5 |
| 7 | 6 |
| 8 | 7 |
| 9 | 8 |
| 10 | 9 |
| 11 | 10 |
| 12 | 11 |
| 13 | 12 |
| 14 | 13 |
| 15 | 14 |
| 16 | 15 |
| 17 | 16 |
| 18 | 17 |
| 19 | 18 |
| 20 | 19 |
| 21 | 20 |
| 22 | 21 |
| 23 | 22 |
| 24 | 23 |
| 26 | 24 |
| 30 | 25 |
| 34 | 26 |
| 37 | 27 |
| 1 SEAT | 28 |
| N/A | 29 |

#### Drive Type (`vpi_drivetype`)

| Label | Value |
|---|---|
| 4X4 | 1 |
| AWD | 2 |
| FWD | 3 |
| RWD | 4 |
| Unknown | 5 |

#### Powertrain Type (`vpi_powertraintype`)

> ⚠️ **VERIFIED 2026-07-31** — correct as documented. This is the Vehicle *Powertrain* set (3 options). It was previously copied into the MVR Fuel Type map by mistake — the MVR `vpi_fueltype` set is different (`Petrol`=1, `Diesel`=2, `Hybrid`=3, `Electric`=4).

| Label | Value |
|---|---|
| Electric | 1 |
| Hybrid | 2 |
| Petrol/Diesel | 3 |

#### Vehicle Type (`vpi_vehicletype`)

| Label | Value |
|---|---|
| Car | 1 |
| Heavy Commercial Vehicle | 2 |
| Light Commercial Vehicle | 3 |

---

## Table 2: Contact (`contacts`)

### Table Information

| Property | Value |
|---|---|
| Display Name | Contact |
| Logical Name | `contacts` |
| Primary Key | `contactid` |
| Type | Standard Dataverse Table |

### Out-of-Box Fields (Used by Application)

| Display Name | Logical Name | Type |
|---|---|---|
| First Name | `firstname` | Text |
| Last Name | `lastname` | Text |
| Email | `emailaddress1` | Email |
| Phone | `telephone1` | Phone |

### Custom Fields

#### City (`vpi_city`)

| Label | Value |
|---|---|
| Dubai | 1 |
| Abu Dhabi | 2 |
| Sharjah | 3 |
| Ajman | 4 |
| Ras Al Khaimah | 5 |
| Fujairah | 6 |
| Umm Al Quwain | 7 |
| Al Ain | 8 |
| Khor Fakkan | 9 |
| Dibba Al Fujairah | 10 |
| Kalba | 11 |
| Madinat Zayed | 12 |
| Ruwais | 13 |
| Jebel Ali | 14 |

#### Country (`vpi_country`)

| Property | Value |
|---|---|
| Display Name | Country |
| Logical Name | `vpi_country` |
| Type | Single Line Text |
| Example | `UAE` |

---

## Table 3: Vehicle Inquiry (`vpi_vehicleinquiries`)

### Table Information

| Property | Value |
|---|---|
| Display Name | Vehicle Inquiry |
| Logical Name | `vpi_vehicleinquiries` |
| Primary Key | `vpi_vehicleinquiryid` (GUID) |

### Lookup Fields

#### Contact Lookup

| Property | Value |
|---|---|
| Logical Name | `vpi_Contact` |
| Type | Lookup |
| Target | Contact (`contacts`) |
| Stored internally as | `_vpi_contact_value` |

#### Vehicle Lookup

| Property | Value |
|---|---|
| Logical Name | `vpi_Vehicle` |
| Type | Lookup |
| Target | Vehicle Data (`vpi_vehicledatas`) |
| Stored internally as | `_vpi_vehicle_value` |

### Choice Fields

#### Status (`vpi_status`)

| Label | Value |
|---|---|
| Pending | 1 |
| Reviewed | 2 |
| Contacted | 3 |
| Closed | 4 |

---

## Table 4: Missing Vehicle Request (`vpi_missingvehiclerequests`)

### Table Information

| Property | Value |
|---|---|
| Display Name | Missing Vehicle Request |
| Logical Name | `vpi_missingvehiclerequests` |
| Primary Key | `vpi_missingvehiclerequestid` (GUID) |

### Purpose

This table records vehicles that users searched for but do not currently exist in the master Vehicle Data table. Instead of losing those searches, they become actionable work items for the admin — serving as a scraper queue, estimated pricing intake, and missing vehicle inbox.

### Fields

| Display Name | Logical Name | Type | Usage |
|---|---|---|---|
| Name | `vpi_name` | Single Line Text | **Primary Name** — composite vehicle title `Make Model Trim` (no Year, matching the Vehicle Data naming convention), e.g. "Mercedes Benz C-Class C 200", set on creation so records are identifiable in Dataverse views/lookups |
| Make | `vpi_make` | Single Line Text | Vehicle make/brand searched by user |
| Model | `vpi_model` | Single Line Text | Vehicle model searched by user |
| Model Year | `vpi_modelyear` | Whole Number | Model year of the searched vehicle |
| Trim | `vpi_trim` | Single Line Text | Vehicle trim / variant |
| Body Type | `vpi_bodytype` | Choice | Body type (Sedan, SUV, etc.) |
| Cylinders | `vpi_cylinders` | Choice | Number of cylinders |
| Doors | `vpi_doors` | Choice | Number of doors |
| Drive Type | `vpi_drivetype` | Choice | FWD, RWD, AWD, 4x4 |
| Engine Size | `vpi_enginesize` | Decimal | Engine displacement |
| Fuel Type | `vpi_fueltype` | Choice | Petrol, Diesel, Hybrid, Electric |
| Horsepower | `vpi_horsepower` | Whole Number | Engine horsepower |
| Seats | `vpi_seats` | Choice | Number of seats |
| Transmission Type | `vpi_transmissiontype` | Choice | Automatic, Manual, CVT, etc. |
| **Category** | `vpi_category` | Choice | Regional spec: GCC (1), Non-GCC (2), Other/Standard (3) |
| Min Price | `vpi_minprice` | Currency | Estimated minimum market price (user-suggested; scraped range lives in `vpi_scraped_minprice`) |
| Max Price | `vpi_maxprice` | Currency | Estimated maximum market price (user-suggested; scraped range lives in `vpi_scraped_maxprice`) |
| Mileage | `vpi_mileage` | Decimal | Scraped mileage from listing (was Min/Max Mileage) |
| Comments | `vpi_user_comment` | Single Line Text | User's comment or note about the vehicle |
| Source URL | `vpi_user_sourceurl` | Single Line Text | URL the user provided as a reference |
| Contact | `vpi_contact` | Lookup | Lookup to Contact table |
| Missing Vehicle | `vpi_missingvehicle` | Lookup | Lookup to Vehicle Data table |
| **Scrape Status** | `vpi_scrapestatus` | Choice | Pending / Testing / In Progress / Scraped / Failed / Unreachable |
| **Scraped Listings** | `vpi_scraped_listings` | Multiple Lines of Text | JSON array of scraped listing data |
| **Scraped Min Price** | `vpi_scraped_minprice` | Currency | Minimum price from scraped listings |
| **Scraped Max Price** | `vpi_scraped_maxprice` | Currency | Maximum price from scraped listings |
| **Scraped Sources** | `vpi_scraped_sources` | Multiple Lines of Text | Source URLs where scraped listings were found |

#### Currency Base Fields (auto-maintained by Dataverse)

| Display Name | Logical Name | Usage |
|---|---|---|
| Min Price (Base) | `vpi_minprice_base` | Not used by application |
| Max Price (Base) | `vpi_maxprice_base` | Not used by application |
| Scraped Min Price (Base) | `vpi_scraped_minprice_base` | Not used by application |
| Scraped Max Price (Base) | `vpi_scraped_maxprice_base` | Not used by application |

### Choice Fields

#### Body Type (`vpi_bodytype`)

> ⚠️ **Verified 2026-07-31** — labels AND values are identical to the [Vehicle Data Body Type](#body-type-vpi_bodytype) set (both 68 options, same integers, same labels). Vehicle Data labels were cleaned in Dataverse on 2026-07-31 to match this set exactly (uppercase `LWB`, uniform ` - ` separator for the SUV subtypes). Both sets are mirrored in code by a single `BODY_TYPE` map.

| Label | Value |
|---|---|
| Bus | 1 |
| Cargo | 2 |
| Cargo Van | 3 |
| Cargo Van High Roof | 4 |
| Compact/Mini MPV | 5 |
| Convertible | 6 |
| Coupe | 7 |
| Coupe/Cabriolet | 8 |
| Crew Cab | 9 |
| Crossbow | 10 |
| Crossover Fastback | 11 |
| Estate | 12 |
| Half Panel Van | 13 |
| Hard Top | 14 |
| Hatchback | 15 |
| Limousine | 16 |
| Long Cargo | 17 |
| Long Van | 18 |
| LWB HR Van | 19 |
| LWB Low Roof Van | 20 |
| LWB Van | 21 |
| Mini Bus | 22 |
| Mini Bus High Roof | 23 |
| Mini Bus LWB | 24 |
| Mini Bus LWB Wide Body HR | 25 |
| Mini Bus Semi High Roof | 26 |
| Mini Van | 27 |
| MPV | 28 |
| Open Top | 29 |
| Panel Van | 30 |
| Panel Van High Roof | 31 |
| Panel Van Wide Body High Roof | 32 |
| Pick Up | 33 |
| Pick Up Double Cab Long Box | 34 |
| Pick Up Ext Cab | 35 |
| Pick Up Ext Cab Long Box | 36 |
| Pick Up Long Box | 37 |
| Pick Up LWB | 38 |
| Pick Up Single Cab | 39 |
| Pick Up Truck | 40 |
| Regular Cab | 41 |
| Regular Cab Chassis | 42 |
| Retractable Hard Top | 43 |
| Sedan | 44 |
| Short Van | 45 |
| Single Cabin Long Cargo | 46 |
| Single Cabin Long Chassis | 47 |
| Single Cabin Std Cargo | 48 |
| Single Cabin Std Chassis | 49 |
| Soft Top | 50 |
| Sportback | 51 |
| Station | 52 |
| SUV | 53 |
| SUV - Compact | 54 |
| SUV - Convertible | 55 |
| SUV - Coupe | 56 |
| SUV - Crossover | 57 |
| SWB Van | 58 |
| Targa | 59 |
| Truck | 60 |
| Van | 61 |
| Van 3.5 Ton | 62 |
| Van 4.5 Ton | 63 |
| Wagon | 64 |
| Wide Body Mini Bus | 65 |
| Wide Body Van | 66 |
| Window Van | 67 |
| Pick Up Double Cab | 68 |

#### Fuel Type (`vpi_fueltype`)

> ⚠️ **Verified 2026-07-31** — a distinct 4-value set. Earlier code/docs assumed `Electric`=1, `Hybrid`=2, `Petrol/Diesel`=3 (copied from the Vehicle *Powertrain* set). The actual MVR set is `Petrol`=1, `Diesel`=2, `Hybrid`=3, `Electric`=4.

| Label | Value |
|---|---|
| Petrol | 1 |
| Diesel | 2 |
| Hybrid | 3 |
| Electric | 4 |

#### Scrape Status (`vpi_scrapestatus`)

| Label | Value | Meaning |
|---|---|---|
| Pending | 1 | Waiting to be scraped |
| Testing | 2 | Running accessibility test |
| In Progress | 3 | Scraping in progress |
| Scraped | 4 | Completed successfully |
| Failed | 5 | Scrape error |
| Unreachable | 6 | YallaMotor blocked / not accessible |

---

## Table 5: Price Suggestion (`vpi_pricesuggestions`)

### Table Information

| Property | Value |
|---|---|
| Display Name | Price Suggestion |
| Logical Name | `vpi_pricesuggestions` |
| Primary Key | `vpi_pricesuggestionid` (GUID) |

### Purpose

This table stores market-based pricing suggestions submitted by users. Instead of directly changing the master vehicle record, suggestions accumulate here until reviewed by an administrator.

### Fields

| Display Name | Logical Name | Type | Usage |
|---|---|---|---|
| Comment | `vpi_comment` | Multiple Lines of Text | User's comment or justification for the suggested price |
| Min Price | `vpi_minprice` | Currency | Suggested minimum price |
| Max Price | `vpi_maxprice` | Currency | Suggested maximum price |
| Source URL | `vpi_sourceurl` | URL | Link to source / listing supporting the suggestion |
| Submitted By | `vpi_submittedby` | Single Line Text | Name or identifier of the person submitting |

### Lookup Fields

#### Vehicle Lookup

| Property | Value |
|---|---|
| Logical Name | `vpi_Vehicle` |
| Type | Lookup |
| Target | Vehicle Data (`vpi_vehicledatas`) |
| Stored internally as | `_vpi_vehicle_value` |

#### Currency Base Fields (auto-maintained by Dataverse)

| Display Name | Logical Name | Usage |
|---|---|---|
| Min Price (Base) | `vpi_minprice_base` | Not used by application |
| Max Price (Base) | `vpi_maxprice_base` | Not used by application |

---

## Business Flow

```
User enters details in wizard
        │
        ▼
┌─── Vehicle exists? ───┐
│  (checked against     │
│   Vehicle Data)       │
└───────┬───────┬───────┘
        │ NO    │ YES
        ▼       ▼
  Missing      Contact
  Vehicle      Created/Found
  Request          │
  Created          ▼
  (scraper   Vehicle Selected
   queue)          │
                   ▼
             Vehicle Inquiry
                Created
                   │
                   ▼
            Admin Reviews Inquiry
                   │
                   ▼
             Status Updated
                   │
                   ▼
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
    Price Suggestion   Vehicle Inquiry
    (user-submitted)   (standard flow)
    → Admin Review
```

### New Phase 3 Flows

1. **Missing Vehicle Request Flow** — When a user searches for a vehicle not in master data, the system creates a `Missing Vehicle Request` record. This feeds a scraper queue and provides estimated pricing data for admin review. Admins can later add the vehicle to master data.

2. **Price Suggestion Flow** — Users (or external sources) submit pricing suggestions linked to existing vehicles. These accumulate in the `Price Suggestion` table for admin review rather than directly modifying the master record.

---

## Dataverse Design Principles

| Data Type | Role |
|---|---|
| Vehicle Data (`vpi_vehicledatas`) | Master Data |
| Contact (`contacts`) | Customer Data |
| Vehicle Inquiry (`vpi_vehicleinquiries`) | Transaction Data |
| Missing Vehicle Request (`vpi_missingvehiclerequests`) | Lead / Workflow Data |
| Price Suggestion (`vpi_pricesuggestions`) | Contribution Data |