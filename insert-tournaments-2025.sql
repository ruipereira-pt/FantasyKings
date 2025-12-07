-- Insert ATP Tournaments for 2025
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
--   ATP MASTERS 1000 -> 'atp_1000'
--   ATP 500 -> 'atp_500'
--   ATP 250 -> 'atp_250'
--   CHALLENGER -> 'challenger'
--   NITTO ATP FINALS -> 'finals'
--
-- Usage:
--   This script will insert all ATP Tour tournaments for 2025.
--   Duplicates are prevented by checking name, start_date, and year.
--   If a tournament with the same name, start_date, and year already exists, it will be skipped.
--
-- Note: Dates are based on week start dates from the calendar.
-- End dates are calculated based on typical tournament duration.

-- Helper function to map surface codes
-- H -> hard, G -> grass, CL -> clay, IH -> hard, ICL -> clay

-- Helper function to map category names
-- GRAND SLAM -> grand_slam
-- ATP MASTERS 1000 -> atp_1000
-- ATP 500 -> atp_500
-- ATP 250 -> atp_250
-- CHALLENGER -> challenger
-- DAVIS CUP -> (skip, not a tournament)
-- NITTO ATP FINALS -> finals

-- Note: Dates are approximate based on week start dates
-- End dates are calculated based on typical tournament duration:
-- Grand Slams: 14 days
-- ATP 1000: 7-8 days
-- ATP 500: 7 days
-- ATP 250: 7 days
-- Challenger: 7 days

BEGIN;

-- JANUARY 2025
INSERT INTO tournaments (name, category, surface, location, start_date, end_date, year, status)
SELECT * FROM (VALUES
-- Week 1 (Dec 27 - Jan 5)
('Brisbane International Presented by Evie', 'atp_250', 'hard', 'Brisbane', '2024-12-30', '2025-01-05', 2025, 'upcoming'),
('Bank of China Hong Kong Tennis Open', 'atp_250', 'hard', 'Hong Kong', '2024-12-30', '2025-01-05', 2025, 'upcoming'),

-- Week 2 (Jan 6-12)
('Adelaide International', 'atp_250', 'hard', 'Adelaide', '2025-01-06', '2025-01-12', 2025, 'upcoming'),
('ASB Classic', 'atp_250', 'hard', 'Auckland', '2025-01-06', '2025-01-12', 2025, 'upcoming'),

-- Week 3-4 (Jan 12-26) - Australian Open
('Australian Open', 'grand_slam', 'hard', 'Melbourne', '2025-01-12', '2025-01-26', 2025, 'upcoming'),

-- Week 5 (Jan 27 - Feb 2)
('Open Occitanie', 'atp_250', 'hard', 'Montpellier', '2025-01-27', '2025-02-02', 2025, 'upcoming'),

-- FEBRUARY 2025
-- Week 6 (Feb 3-9)
('Dallas Open', 'atp_500', 'hard', 'Dallas', '2025-02-03', '2025-02-09', 2025, 'upcoming'),
('ABN AMRO Open', 'atp_500', 'hard', 'Rotterdam', '2025-02-03', '2025-02-09', 2025, 'upcoming'),

-- Week 7 (Feb 10-16)
('IEB+ Argentina Open', 'atp_250', 'clay', 'Buenos Aires', '2025-02-10', '2025-02-16', 2025, 'upcoming'),
('Delray Beach Open', 'atp_250', 'hard', 'Delray Beach', '2025-02-10', '2025-02-16', 2025, 'upcoming'),
('Open 13 Provence', 'atp_250', 'hard', 'Marseille', '2025-02-10', '2025-02-16', 2025, 'upcoming'),

-- Week 8 (Feb 17-23)
('Qatar ExxonMobil Open', 'atp_500', 'hard', 'Doha', '2025-02-17', '2025-02-23', 2025, 'upcoming'),
('Rio Open Presented by Claro', 'atp_500', 'clay', 'Rio de Janeiro', '2025-02-17', '2025-02-23', 2025, 'upcoming'),

-- Week 9 (Feb 24 - Mar 2)
('Abierto Mexicano Telcel Presentado por HSBC', 'atp_500', 'hard', 'Acapulco', '2025-02-24', '2025-03-02', 2025, 'upcoming'),
('Dubai Duty Free Tennis Championships', 'atp_500', 'hard', 'Dubai', '2025-02-24', '2025-03-02', 2025, 'upcoming'),
('BCI Seguros Chile Open', 'atp_250', 'clay', 'Santiago', '2025-02-24', '2025-03-02', 2025, 'upcoming'),

-- MARCH 2025
-- Week 10-11 (Mar 3-16) - Indian Wells
('BNP Paribas Open', 'atp_1000', 'hard', 'Indian Wells', '2025-03-05', '2025-03-16', 2025, 'upcoming'),

-- Week 12-13 (Mar 17-30) - Miami
('Miami Open Presented by Itaú', 'atp_1000', 'hard', 'Miami', '2025-03-19', '2025-03-30', 2025, 'upcoming'),

-- Week 14 (Mar 31 - Apr 6)
('Tiriac Open', 'atp_250', 'clay', 'Bucharest', '2025-03-31', '2025-04-06', 2025, 'upcoming'),
('Fayez Sarofim & Co. U.S. Men''s Clay Court Championship', 'atp_250', 'clay', 'Houston', '2025-03-31', '2025-04-06', 2025, 'upcoming'),
('Grand Prix Hassan II', 'atp_250', 'clay', 'Marrakech', '2025-03-31', '2025-04-06', 2025, 'upcoming'),

-- APRIL 2025
-- Week 15 (Apr 7-13) - Monte Carlo
('Rolex Monte-Carlo Masters', 'atp_1000', 'clay', 'Monte-Carlo', '2025-04-06', '2025-04-13', 2025, 'upcoming'),

-- Week 16 (Apr 14-20)
('Barcelona Open Banc Sabadell', 'atp_500', 'clay', 'Barcelona', '2025-04-14', '2025-04-20', 2025, 'upcoming'),
('BMW Open', 'atp_500', 'clay', 'Munich', '2025-04-14', '2025-04-20', 2025, 'upcoming'),

-- Week 17-18 (Apr 21 - May 4) - Madrid
('Mutua Madrid Open', 'atp_1000', 'clay', 'Madrid', '2025-04-23', '2025-05-04', 2025, 'upcoming'),

-- MAY 2025
-- Week 19-20 (May 5-18) - Rome
('Internazionali BNL d''Italia', 'atp_1000', 'clay', 'Rome', '2025-05-07', '2025-05-18', 2025, 'upcoming'),

-- Week 21 (May 19-25)
('Bitpanda Hamburg Open', 'atp_500', 'clay', 'Hamburg', '2025-05-18', '2025-05-25', 2025, 'upcoming'),
('Gonet Geneva Open', 'atp_250', 'clay', 'Geneva', '2025-05-18', '2025-05-25', 2025, 'upcoming'),

-- Week 22-23 (May 26 - Jun 8) - Roland Garros
('Roland-Garros', 'grand_slam', 'clay', 'Paris', '2025-05-25', '2025-06-08', 2025, 'upcoming'),

-- JUNE 2025
-- Week 24 (Jun 9-15)
('Libema Open', 'atp_250', 'grass', '''s-Hertogenbosch', '2025-06-09', '2025-06-15', 2025, 'upcoming'),
('BOSS Open', 'atp_250', 'grass', 'Stuttgart', '2025-06-09', '2025-06-15', 2025, 'upcoming'),

-- Week 25 (Jun 16-22)
('Terra Wortmann Open', 'atp_500', 'grass', 'Halle', '2025-06-16', '2025-06-22', 2025, 'upcoming'),
('HSBC Championships', 'atp_500', 'grass', 'London', '2025-06-16', '2025-06-22', 2025, 'upcoming'),

-- Week 26 (Jun 23-29)
('Mallorca Championships Presented by Ecotrans Group', 'atp_250', 'grass', 'Mallorca', '2025-06-22', '2025-06-29', 2025, 'upcoming'),
('Lexus Eastbourne Open', 'atp_250', 'grass', 'Eastbourne', '2025-06-23', '2025-06-29', 2025, 'upcoming'),

-- Week 27-28 (Jun 30 - Jul 13) - Wimbledon
('The Championships, Wimbledon', 'grand_slam', 'grass', 'London', '2025-06-30', '2025-07-13', 2025, 'upcoming'),

-- JULY 2025
-- Week 29 (Jul 14-20)
('Swedish Open', 'atp_250', 'clay', 'Båstad', '2025-07-14', '2025-07-20', 2025, 'upcoming'),
('Hall of Fame Open', 'atp_250', 'grass', 'Newport', '2025-07-14', '2025-07-20', 2025, 'upcoming'),

-- Week 30 (Jul 21-27)
('EFG Swiss Open Gstaad', 'atp_250', 'clay', 'Gstaad', '2025-07-21', '2025-07-27', 2025, 'upcoming'),
('Plava Laguna Croatia Open Umag', 'atp_250', 'clay', 'Umag', '2025-07-21', '2025-07-27', 2025, 'upcoming'),

-- Week 31 (Jul 28 - Aug 3)
('Generali Open', 'atp_250', 'clay', 'Kitzbühel', '2025-07-28', '2025-08-03', 2025, 'upcoming'),
('Mubadala Citi DC Open', 'atp_500', 'hard', 'Washington', '2025-07-28', '2025-08-03', 2025, 'upcoming'),

-- AUGUST 2025
-- Week 32 (Aug 4-10)
('National Bank Open Presented by Rogers', 'atp_1000', 'hard', 'Toronto', '2025-08-04', '2025-08-10', 2025, 'upcoming'),

-- Week 33 (Aug 11-17)
('Western & Southern Open', 'atp_1000', 'hard', 'Cincinnati', '2025-08-11', '2025-08-17', 2025, 'upcoming'),

-- Week 34 (Aug 18-24)
('Winston-Salem Open', 'atp_250', 'hard', 'Winston-Salem', '2025-08-18', '2025-08-24', 2025, 'upcoming'),

-- Week 35-36 (Aug 25 - Sep 7) - US Open
('US Open', 'grand_slam', 'hard', 'New York', '2025-08-25', '2025-09-07', 2025, 'upcoming'),

-- SEPTEMBER 2025
-- Week 37 (Sep 8-14)
('Chengdu Open', 'atp_250', 'hard', 'Chengdu', '2025-09-08', '2025-09-14', 2025, 'upcoming'),
('Zhuhai Championships', 'atp_250', 'hard', 'Zhuhai', '2025-09-08', '2025-09-14', 2025, 'upcoming'),

-- Week 38 (Sep 15-21)
('China Open', 'atp_500', 'hard', 'Beijing', '2025-09-15', '2025-09-21', 2025, 'upcoming'),
('Huafa Properties Zhuhai Championships', 'atp_250', 'hard', 'Zhuhai', '2025-09-15', '2025-09-21', 2025, 'upcoming'),

-- Week 39 (Sep 22-28)
('Rolex Shanghai Masters', 'atp_1000', 'hard', 'Shanghai', '2025-09-22', '2025-10-05', 2025, 'upcoming'),

-- Week 40 (Sep 29 - Oct 5)
('Astana Open', 'atp_250', 'hard', 'Astana', '2025-09-29', '2025-10-05', 2025, 'upcoming'),
('Japan Open Tennis Championships', 'atp_500', 'hard', 'Tokyo', '2025-09-29', '2025-10-05', 2025, 'upcoming'),

-- OCTOBER 2025
-- Week 41 (Oct 6-12) - Note: Shanghai Masters spans weeks 39-40, no separate week 41 ATP 1000

-- Week 42 (Oct 13-19)
('European Open', 'atp_250', 'hard', 'Antwerp', '2025-10-13', '2025-10-19', 2025, 'upcoming'),
('Stockholm Open', 'atp_250', 'hard', 'Stockholm', '2025-10-13', '2025-10-19', 2025, 'upcoming'),

-- Week 43 (Oct 20-26)
('Erste Bank Open', 'atp_500', 'hard', 'Vienna', '2025-10-20', '2025-10-26', 2025, 'upcoming'),
('Swiss Indoors Basel', 'atp_500', 'hard', 'Basel', '2025-10-20', '2025-10-26', 2025, 'upcoming'),

-- Week 44 (Oct 27 - Nov 2)
('Rolex Paris Masters', 'atp_1000', 'hard', 'Paris', '2025-10-27', '2025-11-02', 2025, 'upcoming'),

-- NOVEMBER 2025
-- Week 45 (Nov 3-9)
-- Note: Some Challenger tournaments listed, but focusing on ATP Tour events

-- Week 46 (Nov 10-16)
('Nitto ATP Finals', 'finals', 'hard', 'Turin', '2025-11-10', '2025-11-16', 2025, 'upcoming'),

-- Week 47 (Nov 17-23)
-- Davis Cup Finals (not a tournament, skip)

-- Week 48 (Nov 24-30)
-- End of season
) AS t(name text, category text, surface text, location text, start_date date, end_date date, year integer, status text)
WHERE NOT EXISTS (
  SELECT 1 FROM tournaments 
  WHERE tournaments.name = t.name 
    AND tournaments.start_date = t.start_date
    AND tournaments.year = t.year
);

COMMIT;

-- Verify inserted tournaments
SELECT 
  category,
  COUNT(*) as count,
  MIN(start_date) as earliest_start,
  MAX(end_date) as latest_end
FROM tournaments
WHERE year = 2025
GROUP BY category
ORDER BY 
  CASE category
    WHEN 'grand_slam' THEN 1
    WHEN 'atp_1000' THEN 2
    WHEN 'atp_500' THEN 3
    WHEN 'atp_250' THEN 4
    WHEN 'finals' THEN 5
    WHEN 'challenger' THEN 6
  END;

