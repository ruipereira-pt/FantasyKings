-- Insert ATP Tour and Challenger Tournaments for 2025-2026
-- Based on 2025-26 ATP Challenger Calendar (as of 21 November 2025)
-- 
-- Surface codes mapping:
--   H (Hardcourt) -> 'hard'
--   G (Grass) -> 'grass'
--   IH (Indoor Hardcourt) -> 'hard'
--   CL (Clay) -> 'clay'
--   ICL (Indoor Clay) -> 'clay'
--
-- Category mapping:
--   GRAND SLAM -> 'grand_slam'
--   ATP MASTERS 1000 -> 'masters_1000'
--   ATP 500 -> '500'
--   ATP 250 -> '250'
--   CHALLENGER -> 'challenger'
--   NITTO ATP FINALS -> 'finals'
--
-- Status is set dynamically:
--   'completed' if end_date < CURRENT_DATE
--   'ongoing' if start_date <= CURRENT_DATE <= end_date
--   'upcoming' if start_date > CURRENT_DATE
--
-- Usage:
--   This script will insert all ATP Tour and Challenger tournaments for 2025-2026.
--   Duplicates are prevented by checking name, start_date, and year.
--   Status is automatically set based on current date.

BEGIN;

-- Insert all tournaments with dynamic status calculation
WITH tournament_data AS (
  SELECT 
    name,
    category,
    surface,
    location,
    start_date::date as start_date,
    end_date::date as end_date,
    year::integer as year
  FROM (VALUES
-- ============================================
-- 2025 ATP TOUR TOURNAMENTS
-- ============================================

-- JANUARY 2025
-- Week 1 (Dec 27 - Jan 5)
('Brisbane International Presented by Evie', '250', 'hard', 'Brisbane', '2024-12-30', '2025-01-05', 2025),
('Bank of China Hong Kong Tennis Open', '250', 'hard', 'Hong Kong', '2024-12-30', '2025-01-05', 2025),

-- Week 2 (Jan 6-12)
('Adelaide International', '250', 'hard', 'Adelaide', '2025-01-06', '2025-01-12', 2025),
('ASB Classic', '250', 'hard', 'Auckland', '2025-01-06', '2025-01-12', 2025),

-- Week 3-4 (Jan 12-26) - Australian Open
('Australian Open', 'grand_slam', 'hard', 'Melbourne', '2025-01-12', '2025-01-26', 2025),

-- Week 5 (Jan 27 - Feb 2)
('Open Occitanie', '250', 'hard', 'Montpellier', '2025-01-27', '2025-02-02', 2025),

-- FEBRUARY 2025
-- Week 6 (Feb 3-9)
('Dallas Open', '500', 'hard', 'Dallas', '2025-02-03', '2025-02-09', 2025),
('ABN AMRO Open', '500', 'hard', 'Rotterdam', '2025-02-03', '2025-02-09', 2025),

-- Week 7 (Feb 10-16)
('IEB+ Argentina Open', '250', 'clay', 'Buenos Aires', '2025-02-10', '2025-02-16', 2025),
('Delray Beach Open', '250', 'hard', 'Delray Beach', '2025-02-10', '2025-02-16', 2025),
('Open 13 Provence', '250', 'hard', 'Marseille', '2025-02-10', '2025-02-16', 2025),

-- Week 8 (Feb 17-23)
('Qatar ExxonMobil Open', '500', 'hard', 'Doha', '2025-02-17', '2025-02-23', 2025),
('Rio Open Presented by Claro', '500', 'clay', 'Rio de Janeiro', '2025-02-17', '2025-02-23', 2025),

-- Week 9 (Feb 24 - Mar 2)
('Abierto Mexicano Telcel Presentado por HSBC', '500', 'hard', 'Acapulco', '2025-02-24', '2025-03-02', 2025),
('Dubai Duty Free Tennis Championships', '500', 'hard', 'Dubai', '2025-02-24', '2025-03-02', 2025),
('BCI Seguros Chile Open', '250', 'clay', 'Santiago', '2025-02-24', '2025-03-02', 2025),

-- MARCH 2025
-- Week 10-11 (Mar 3-16) - Indian Wells
('BNP Paribas Open', 'masters_1000', 'hard', 'Indian Wells', '2025-03-05', '2025-03-16', 2025),

-- Week 12-13 (Mar 17-30) - Miami
('Miami Open Presented by Itaú', 'masters_1000', 'hard', 'Miami', '2025-03-19', '2025-03-30', 2025),

-- Week 14 (Mar 31 - Apr 6)
('Tiriac Open', '250', 'clay', 'Bucharest', '2025-03-31', '2025-04-06', 2025),
('Fayez Sarofim & Co. U.S. Men''s Clay Court Championship', '250', 'clay', 'Houston', '2025-03-31', '2025-04-06', 2025),
('Grand Prix Hassan II', '250', 'clay', 'Marrakech', '2025-03-31', '2025-04-06', 2025),

-- APRIL 2025
-- Week 15 (Apr 7-13) - Monte Carlo
('Rolex Monte-Carlo Masters', 'masters_1000', 'clay', 'Monte-Carlo', '2025-04-06', '2025-04-13', 2025),

-- Week 16 (Apr 14-20)
('Barcelona Open Banc Sabadell', '500', 'clay', 'Barcelona', '2025-04-14', '2025-04-20', 2025),
('BMW Open', '500', 'clay', 'Munich', '2025-04-14', '2025-04-20', 2025),

-- Week 17-18 (Apr 21 - May 4) - Madrid
('Mutua Madrid Open', 'masters_1000', 'clay', 'Madrid', '2025-04-23', '2025-05-04', 2025),

-- MAY 2025
-- Week 19-20 (May 5-18) - Rome
('Internazionali BNL d''Italia', 'masters_1000', 'clay', 'Rome', '2025-05-07', '2025-05-18', 2025),

-- Week 21 (May 19-25)
('Bitpanda Hamburg Open', '500', 'clay', 'Hamburg', '2025-05-18', '2025-05-25', 2025),
('Gonet Geneva Open', '250', 'clay', 'Geneva', '2025-05-18', '2025-05-25', 2025),

-- Week 22-23 (May 26 - Jun 8) - Roland Garros
('Roland-Garros', 'grand_slam', 'clay', 'Paris', '2025-05-25', '2025-06-08', 2025),

-- JUNE 2025
-- Week 24 (Jun 9-15)
('Libema Open', '250', 'grass', '''s-Hertogenbosch', '2025-06-09', '2025-06-15', 2025),
('BOSS Open', '250', 'grass', 'Stuttgart', '2025-06-09', '2025-06-15', 2025),

-- Week 25 (Jun 16-22)
('Terra Wortmann Open', '500', 'grass', 'Halle', '2025-06-16', '2025-06-22', 2025),
('HSBC Championships', '500', 'grass', 'London', '2025-06-16', '2025-06-22', 2025),

-- Week 26 (Jun 23-29)
('Mallorca Championships Presented by Ecotrans Group', '250', 'grass', 'Mallorca', '2025-06-22', '2025-06-29', 2025),
('Lexus Eastbourne Open', '250', 'grass', 'Eastbourne', '2025-06-23', '2025-06-29', 2025),

-- Week 27-28 (Jun 30 - Jul 13) - Wimbledon
('The Championships, Wimbledon', 'grand_slam', 'grass', 'London', '2025-06-30', '2025-07-13', 2025),

-- JULY 2025
-- Week 29 (Jul 14-20)
('Swedish Open', '250', 'clay', 'Båstad', '2025-07-14', '2025-07-20', 2025),
('Hall of Fame Open', '250', 'grass', 'Newport', '2025-07-14', '2025-07-20', 2025),

-- Week 30 (Jul 21-27)
('EFG Swiss Open Gstaad', '250', 'clay', 'Gstaad', '2025-07-21', '2025-07-27', 2025),
('Plava Laguna Croatia Open Umag', '250', 'clay', 'Umag', '2025-07-21', '2025-07-27', 2025),

-- Week 31 (Jul 28 - Aug 3)
('Generali Open', '250', 'clay', 'Kitzbühel', '2025-07-28', '2025-08-03', 2025),
('Mubadala Citi DC Open', '500', 'hard', 'Washington', '2025-07-28', '2025-08-03', 2025),

-- AUGUST 2025
-- Week 32 (Aug 4-10)
('National Bank Open Presented by Rogers', 'masters_1000', 'hard', 'Toronto', '2025-08-04', '2025-08-10', 2025),

-- Week 33 (Aug 11-17)
('Western & Southern Open', 'masters_1000', 'hard', 'Cincinnati', '2025-08-11', '2025-08-17', 2025),

-- Week 34 (Aug 18-24)
('Winston-Salem Open', '250', 'hard', 'Winston-Salem', '2025-08-18', '2025-08-24', 2025),

-- Week 35-36 (Aug 25 - Sep 7) - US Open
('US Open', 'grand_slam', 'hard', 'New York', '2025-08-25', '2025-09-07', 2025),

-- SEPTEMBER 2025
-- Week 37 (Sep 8-14)
('Chengdu Open', '250', 'hard', 'Chengdu', '2025-09-08', '2025-09-14', 2025),
('Zhuhai Championships', '250', 'hard', 'Zhuhai', '2025-09-08', '2025-09-14', 2025),

-- Week 38 (Sep 15-21)
('China Open', '500', 'hard', 'Beijing', '2025-09-15', '2025-09-21', 2025),
('Huafa Properties Zhuhai Championships', '250', 'hard', 'Zhuhai', '2025-09-15', '2025-09-21', 2025),

-- Week 39-40 (Sep 22 - Oct 5) - Shanghai Masters
('Rolex Shanghai Masters', 'masters_1000', 'hard', 'Shanghai', '2025-09-22', '2025-10-05', 2025),

-- Week 40 (Sep 29 - Oct 5)
('Astana Open', '250', 'hard', 'Astana', '2025-09-29', '2025-10-05', 2025),
('Japan Open Tennis Championships', '500', 'hard', 'Tokyo', '2025-09-29', '2025-10-05', 2025),

-- OCTOBER 2025
-- Week 42 (Oct 13-19)
('European Open', '250', 'hard', 'Antwerp', '2025-10-13', '2025-10-19', 2025),
('Stockholm Open', '250', 'hard', 'Stockholm', '2025-10-13', '2025-10-19', 2025),

-- Week 43 (Oct 20-26)
('Erste Bank Open', '500', 'hard', 'Vienna', '2025-10-20', '2025-10-26', 2025),
('Swiss Indoors Basel', '500', 'hard', 'Basel', '2025-10-20', '2025-10-26', 2025),

-- Week 44 (Oct 27 - Nov 2)
('Rolex Paris Masters', 'masters_1000', 'hard', 'Paris', '2025-10-27', '2025-11-02', 2025),

-- NOVEMBER 2025
-- Week 46 (Nov 10-16)
('Nitto ATP Finals', 'finals', 'hard', 'Turin', '2025-11-10', '2025-11-16', 2025),

-- ============================================
-- 2026 ATP TOUR TOURNAMENTS
-- ============================================

-- JANUARY 2026
-- Week 1 (Jan 5-11)
('Brisbane International', '250', 'hard', 'Brisbane', '2026-01-05', '2026-01-11', 2026),
('Hong Kong Tennis Open', '250', 'hard', 'Hong Kong', '2026-01-05', '2026-01-11', 2026),

-- Week 2 (Jan 12-18)
('Adelaide International', '250', 'hard', 'Adelaide', '2026-01-12', '2026-01-18', 2026),
('ASB Classic', '250', 'hard', 'Auckland', '2026-01-12', '2026-01-18', 2026),

-- Week 3-4 (Jan 19 - Feb 1) - Australian Open
('Australian Open', 'grand_slam', 'hard', 'Melbourne', '2026-01-19', '2026-02-01', 2026),

-- FEBRUARY 2026
-- Week 5 (Feb 2-8)
('Open Sud de France', '250', 'hard', 'Montpellier', '2026-02-02', '2026-02-08', 2026),
('Dallas Open', '500', 'hard', 'Dallas', '2026-02-02', '2026-02-08', 2026),
('ABN AMRO Open', '500', 'hard', 'Rotterdam', '2026-02-02', '2026-02-08', 2026),

-- Week 6 (Feb 9-15)
('Argentina Open', '250', 'clay', 'Buenos Aires', '2026-02-09', '2026-02-15', 2026),
('Delray Beach Open', '250', 'hard', 'Delray Beach', '2026-02-09', '2026-02-15', 2026),
('Open 13 Provence', '250', 'hard', 'Marseille', '2026-02-09', '2026-02-15', 2026),

-- Week 7 (Feb 16-22)
('Qatar ExxonMobil Open', '500', 'hard', 'Doha', '2026-02-16', '2026-02-22', 2026),
('Rio Open', '500', 'clay', 'Rio de Janeiro', '2026-02-16', '2026-02-22', 2026),

-- Week 8 (Feb 23 - Mar 1)
('Abierto Mexicano Telcel', '500', 'hard', 'Acapulco', '2026-02-23', '2026-03-01', 2026),
('Dubai Duty Free Tennis Championships', '500', 'hard', 'Dubai', '2026-02-23', '2026-03-01', 2026),
('Chile Open', '250', 'clay', 'Santiago', '2026-02-23', '2026-03-01', 2026),

-- MARCH 2026
-- Week 9-10 (Mar 2-15) - Indian Wells
('BNP Paribas Open', 'masters_1000', 'hard', 'Indian Wells', '2026-03-02', '2026-03-15', 2026),

-- Week 11-12 (Mar 16-29) - Miami
('Miami Open', 'masters_1000', 'hard', 'Miami', '2026-03-16', '2026-03-29', 2026),

-- APRIL 2026
-- Week 13 (Mar 30 - Apr 5)
('Grand Prix Hassan II', '250', 'clay', 'Marrakech', '2026-03-30', '2026-04-05', 2026),
('U.S. Men''s Clay Court Championship', '250', 'clay', 'Houston', '2026-03-30', '2026-04-05', 2026),

-- Week 14 (Apr 6-12) - Monte Carlo
('Rolex Monte-Carlo Masters', 'masters_1000', 'clay', 'Monte-Carlo', '2026-04-06', '2026-04-12', 2026),

-- Week 15 (Apr 13-19)
('Barcelona Open Banc Sabadell', '500', 'clay', 'Barcelona', '2026-04-13', '2026-04-19', 2026),
('BMW Open', '500', 'clay', 'Munich', '2026-04-13', '2026-04-19', 2026),

-- Week 16-17 (Apr 20 - May 3) - Madrid
('Mutua Madrid Open', 'masters_1000', 'clay', 'Madrid', '2026-04-20', '2026-05-03', 2026),

-- MAY 2026
-- Week 18-19 (May 4-17) - Rome
('Internazionali BNL d''Italia', 'masters_1000', 'clay', 'Rome', '2026-05-04', '2026-05-17', 2026),

-- Week 20 (May 18-24)
('Hamburg Open', '500', 'clay', 'Hamburg', '2026-05-18', '2026-05-24', 2026),
('Geneva Open', '250', 'clay', 'Geneva', '2026-05-18', '2026-05-24', 2026),

-- Week 21-22 (May 25 - Jun 7) - Roland Garros
('Roland-Garros', 'grand_slam', 'clay', 'Paris', '2026-05-25', '2026-06-07', 2026),

-- JUNE 2026
-- Week 23 (Jun 8-14)
('Libema Open', '250', 'grass', '''s-Hertogenbosch', '2026-06-08', '2026-06-14', 2026),
('BOSS Open', '250', 'grass', 'Stuttgart', '2026-06-08', '2026-06-14', 2026),

-- Week 24 (Jun 15-21)
('Terra Wortmann Open', '500', 'grass', 'Halle', '2026-06-15', '2026-06-21', 2026),
('Queen''s Club Championships', '500', 'grass', 'London', '2026-06-15', '2026-06-21', 2026),

-- Week 25 (Jun 22-28)
('Mallorca Championships', '250', 'grass', 'Mallorca', '2026-06-22', '2026-06-28', 2026),
('Eastbourne International', '250', 'grass', 'Eastbourne', '2026-06-22', '2026-06-28', 2026),

-- Week 26-27 (Jun 29 - Jul 12) - Wimbledon
('The Championships, Wimbledon', 'grand_slam', 'grass', 'London', '2026-06-29', '2026-07-12', 2026),

-- JULY 2026
-- Week 28 (Jul 13-19)
('Swedish Open', '250', 'clay', 'Båstad', '2026-07-13', '2026-07-19', 2026),
('Hall of Fame Open', '250', 'grass', 'Newport', '2026-07-13', '2026-07-19', 2026),

-- Week 29 (Jul 20-26)
('Swiss Open Gstaad', '250', 'clay', 'Gstaad', '2026-07-20', '2026-07-26', 2026),
('Croatia Open Umag', '250', 'clay', 'Umag', '2026-07-20', '2026-07-26', 2026),

-- Week 30 (Jul 27 - Aug 2)
('Generali Open', '250', 'clay', 'Kitzbühel', '2026-07-27', '2026-08-02', 2026),
('Citi Open', '500', 'hard', 'Washington', '2026-07-27', '2026-08-02', 2026),

-- AUGUST 2026
-- Week 31 (Aug 3-9)
('National Bank Open', 'masters_1000', 'hard', 'Toronto', '2026-08-03', '2026-08-09', 2026),

-- Week 32 (Aug 10-16)
('Western & Southern Open', 'masters_1000', 'hard', 'Cincinnati', '2026-08-10', '2026-08-16', 2026),

-- Week 33 (Aug 17-23)
('Winston-Salem Open', '250', 'hard', 'Winston-Salem', '2026-08-17', '2026-08-23', 2026),

-- Week 34-35 (Aug 24 - Sep 6) - US Open
('US Open', 'grand_slam', 'hard', 'New York', '2026-08-24', '2026-09-06', 2026),

-- SEPTEMBER 2026
-- Week 36 (Sep 7-13)
('Chengdu Open', '250', 'hard', 'Chengdu', '2026-09-07', '2026-09-13', 2026),
('Zhuhai Championships', '250', 'hard', 'Zhuhai', '2026-09-07', '2026-09-13', 2026),

-- Week 37 (Sep 14-20)
('China Open', '500', 'hard', 'Beijing', '2026-09-14', '2026-09-20', 2026),

-- Week 38-39 (Sep 21 - Oct 4) - Shanghai Masters
('Rolex Shanghai Masters', 'masters_1000', 'hard', 'Shanghai', '2026-09-21', '2026-10-04', 2026),

-- Week 39 (Sep 28 - Oct 4)
('Astana Open', '250', 'hard', 'Astana', '2026-09-28', '2026-10-04', 2026),
('Japan Open', '500', 'hard', 'Tokyo', '2026-09-28', '2026-10-04', 2026),

-- OCTOBER 2026
-- Week 41 (Oct 12-18)
('European Open', '250', 'hard', 'Antwerp', '2026-10-12', '2026-10-18', 2026),
('Stockholm Open', '250', 'hard', 'Stockholm', '2026-10-12', '2026-10-18', 2026),

-- Week 42 (Oct 19-25)
('Erste Bank Open', '500', 'hard', 'Vienna', '2026-10-19', '2026-10-25', 2026),
('Swiss Indoors Basel', '500', 'hard', 'Basel', '2026-10-19', '2026-10-25', 2026),

-- Week 43 (Oct 26 - Nov 1)
('Rolex Paris Masters', 'masters_1000', 'hard', 'Paris', '2026-10-26', '2026-11-01', 2026),

-- NOVEMBER 2026
-- Week 45 (Nov 9-15)
('Nitto ATP Finals', 'finals', 'hard', 'Turin', '2026-11-09', '2026-11-15', 2026),

-- ============================================
-- 2025 CHALLENGER TOURNAMENTS (Sample)
-- ============================================
-- Note: This includes a selection of major Challenger tournaments.
-- Full Challenger calendar has 100+ events per year and should be synced via API.

-- JANUARY 2025 Challengers
('Challenger Nouméa', 'challenger', 'hard', 'Nouméa', '2025-01-06', '2025-01-12', 2025),
('Challenger Nonthaburi 1', 'challenger', 'hard', 'Nonthaburi', '2025-01-06', '2025-01-12', 2025),
('Challenger Canberra', 'challenger', 'hard', 'Canberra', '2025-01-06', '2025-01-12', 2025),

-- FEBRUARY 2025 Challengers
('Challenger Oeiras 1', 'challenger', 'hard', 'Oeiras', '2025-02-03', '2025-02-09', 2025),
('Challenger Itajaí', 'challenger', 'clay', 'Itajaí', '2025-02-03', '2025-02-09', 2025),
('Challenger Soma Bay', 'challenger', 'hard', 'Soma Bay', '2025-02-03', '2025-02-09', 2025),

-- MARCH 2025 Challengers
('Challenger Phoenix', 'challenger', 'hard', 'Phoenix', '2025-03-03', '2025-03-09', 2025),
('Challenger Santiago', 'challenger', 'clay', 'Santiago', '2025-03-10', '2025-03-16', 2025),
('Challenger Zadar', 'challenger', 'clay', 'Zadar', '2025-03-17', '2025-03-23', 2025),

-- APRIL 2025 Challengers
('Challenger San Luis Potosí', 'challenger', 'clay', 'San Luis Potosí', '2025-04-07', '2025-04-13', 2025),
('Challenger Tallahassee', 'challenger', 'hard', 'Tallahassee', '2025-04-14', '2025-04-20', 2025),
('Challenger Oeiras 2', 'challenger', 'clay', 'Oeiras', '2025-04-21', '2025-04-27', 2025),

-- MAY 2025 Challengers
('Challenger Prague', 'challenger', 'clay', 'Prague', '2025-05-05', '2025-05-11', 2025),
('Challenger Heilbronn', 'challenger', 'clay', 'Heilbronn', '2025-05-12', '2025-05-18', 2025),
('Challenger Bordeaux', 'challenger', 'clay', 'Bordeaux', '2025-05-19', '2025-05-25', 2025),

-- JUNE 2025 Challengers
('Challenger Perugia', 'challenger', 'clay', 'Perugia', '2025-06-09', '2025-06-15', 2025),
('Challenger Ilkley', 'challenger', 'grass', 'Ilkley', '2025-06-16', '2025-06-22', 2025),
('Challenger Blois', 'challenger', 'clay', 'Blois', '2025-06-23', '2025-06-29', 2025),

-- JULY 2025 Challengers
('Challenger Amersfoort', 'challenger', 'clay', 'Amersfoort', '2025-07-07', '2025-07-13', 2025),
('Challenger Tampere', 'challenger', 'clay', 'Tampere', '2025-07-14', '2025-07-20', 2025),
('Challenger Zug', 'challenger', 'clay', 'Zug', '2025-07-21', '2025-07-27', 2025),

-- AUGUST 2025 Challengers
('Challenger Cordenons', 'challenger', 'clay', 'Cordenons', '2025-08-04', '2025-08-10', 2025),
('Challenger Meerbusch', 'challenger', 'clay', 'Meerbusch', '2025-08-11', '2025-08-17', 2025),
('Challenger Stanford', 'challenger', 'hard', 'Stanford', '2025-08-18', '2025-08-24', 2025),

-- SEPTEMBER 2025 Challengers
('Challenger Genoa', 'challenger', 'clay', 'Genoa', '2025-09-01', '2025-09-07', 2025),
('Challenger Cassis', 'challenger', 'hard', 'Cassis', '2025-09-08', '2025-09-14', 2025),
('Challenger Szczecin', 'challenger', 'clay', 'Szczecin', '2025-09-15', '2025-09-21', 2025),

-- OCTOBER 2025 Challengers
('Challenger Lisbon', 'challenger', 'clay', 'Lisbon', '2025-10-06', '2025-10-12', 2025),
('Challenger Alicante', 'challenger', 'hard', 'Alicante', '2025-10-13', '2025-10-19', 2025),
('Challenger Brest', 'challenger', 'hard', 'Brest', '2025-10-20', '2025-10-26', 2025),

-- NOVEMBER 2025 Challengers
('Challenger Helsinki', 'challenger', 'hard', 'Helsinki', '2025-11-03', '2025-11-09', 2025),
('Challenger Montevideo', 'challenger', 'clay', 'Montevideo', '2025-11-10', '2025-11-16', 2025),
('Challenger Bergamo', 'challenger', 'hard', 'Bergamo', '2025-11-17', '2025-11-23', 2025),

-- DECEMBER 2025 Challengers
('Challenger Maia', 'challenger', 'clay', 'Maia', '2025-12-01', '2025-12-07', 2025),
('Challenger Temuco', 'challenger', 'hard', 'Temuco', '2025-12-08', '2025-12-14', 2025),
('Challenger Bogotá', 'challenger', 'clay', 'Bogotá', '2025-12-15', '2025-12-21', 2025),

-- ============================================
-- 2026 CHALLENGER TOURNAMENTS (Sample)
-- ============================================

-- JANUARY 2026 Challengers
('Challenger Annapurna', 'challenger', 'hard', 'Annapurna', '2026-01-05', '2026-01-11', 2026),
('Challenger Canberra', 'challenger', 'hard', 'Canberra', '2026-01-05', '2026-01-11', 2026),
('Challenger Nonthaburi 1', 'challenger', 'hard', 'Nonthaburi', '2026-01-05', '2026-01-11', 2026),
('Challenger Nottingham 1', 'challenger', 'hard', 'Nottingham', '2026-01-05', '2026-01-11', 2026),

-- FEBRUARY 2026 Challengers
('Challenger Nonthaburi 2', 'challenger', 'hard', 'Nonthaburi', '2026-02-02', '2026-02-08', 2026),
('Challenger Buenos Aires', 'challenger', 'clay', 'Buenos Aires', '2026-02-02', '2026-02-08', 2026),
('Challenger Glasgow', 'challenger', 'hard', 'Glasgow', '2026-02-02', '2026-02-08', 2026),

-- MARCH 2026 Challengers
('Challenger Oeiras 1', 'challenger', 'hard', 'Oeiras', '2026-03-02', '2026-03-08', 2026),
('Challenger Itajaí', 'challenger', 'clay', 'Itajaí', '2026-03-02', '2026-03-08', 2026),
('Challenger Soma Bay', 'challenger', 'hard', 'Soma Bay', '2026-03-02', '2026-03-08', 2026)

-- Note: Full Challenger calendar includes 100+ tournaments per year.
-- Additional Challenger tournaments should be synced via the sync-tournaments function.

) AS t(name, category, surface, location, start_date, end_date, year)
)
INSERT INTO tournaments (name, category, surface, location, start_date, end_date, year, status)
SELECT 
  t.name,
  t.category,
  t.surface,
  t.location,
  t.start_date,
  t.end_date,
  t.year,
  CASE
    WHEN t.end_date < CURRENT_DATE THEN 'completed'
    WHEN t.start_date <= CURRENT_DATE AND t.end_date >= CURRENT_DATE THEN 'ongoing'
    ELSE 'upcoming'
  END as status
FROM tournament_data t
WHERE NOT EXISTS (
  SELECT 1 FROM tournaments 
  WHERE tournaments.name = t.name 
    AND tournaments.start_date = t.start_date
    AND tournaments.year = t.year
);

-- Update status for all tournaments (including newly inserted and existing) based on current date
UPDATE tournaments
SET status = CASE
  WHEN end_date < CURRENT_DATE THEN 'completed'
  WHEN start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE THEN 'ongoing'
  ELSE 'upcoming'
END,
updated_at = now()
WHERE year IN (2025, 2026);

COMMIT;

-- Verify inserted tournaments
SELECT 
  year,
  category,
  status,
  COUNT(*) as count,
  MIN(start_date) as earliest_start,
  MAX(end_date) as latest_end
FROM tournaments
WHERE year IN (2025, 2026)
GROUP BY year, category, status
ORDER BY year, 
  CASE category
    WHEN 'grand_slam' THEN 1
    WHEN 'masters_1000' THEN 2
    WHEN '500' THEN 3
    WHEN '250' THEN 4
    WHEN 'finals' THEN 5
    WHEN 'challenger' THEN 6
  END,
  CASE status
    WHEN 'completed' THEN 1
    WHEN 'ongoing' THEN 2
    WHEN 'upcoming' THEN 3
  END;

