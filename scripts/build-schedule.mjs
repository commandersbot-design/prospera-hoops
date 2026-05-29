// Build src/data/schedule.json from the Capitol Hoops 2026 summer-league
// schedule. The raw block below is two physical lines per game:
//   <Date> <Home> vs <Away> <Result-or-Time>
//   <Court>
// Home team is always listed first. A result like "91 - 69" marks a final;
// a time like "7:30 pm" marks an upcoming game. Run: node scripts/build-schedule.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RAW = `
May 18, 2026 Potomac School vs Coolidge 91 - 69
Dematha-Court 1
May 18, 2026 South County vs Takoma Academy 72 - 78
Dematha-Court 2
May 18, 2026 DeMatha vs John Handley 111 - 43
Dematha-Court 1
May 18, 2026 Seahawks (South River) vs Potomac (VA) 50 - 40
Dematha-Court 2
May 18, 2026 Crofton vs So MD Christian 31 - 56
Dematha-Court 1
May 18, 2026 St. Mary’s Annapolis vs Flint Hill 50 - 59
Dematha-Court 2
May 18, 2026 Sandy Spring vs John Handley 75 - 74
Dematha-Court 1
May 18, 2026 Potomac (VA) vs Tenley Tigers (Jackson Reed) 37 - 61
Dematha-Court 2
May 19, 2026 Clinton Grace vs New Hope Academy 58 - 65
Dematha-Court 1
May 19, 2026 Good Counsel vs So MD Christian 53 - 40
Dematha-Court 2
May 19, 2026 Glenelg Country vs Patriot 42 - 54
Dematha-Court 1
May 19, 2026 Annapolis Area Christian vs Landon 44 - 73
Dematha-Court 2
May 19, 2026 Virginia Academy vs Concordia Prep 69 - 68
Dematha-Court 1
May 19, 2026 Clinton Grace vs Hawks (Hayfield) 70 - 48
Dematha-Court 2
May 19, 2026 Bethel Academy vs Glenelg Country 74 - 65
Dematha-Court 1
May 19, 2026 Annapolis Area Christian vs Patriot 41 - 67
Dematha-Court 2
May 20, 2026 DeMatha vs Tenley Tigers (Jackson Reed) 78 - 93
Dematha-Court 1
May 20, 2026 Sandy Spring vs Wildcats (WJ) 56 - 82
Dematha-Court 2
May 20, 2026 Crofton vs Swarmin’ Hornets (Damascus) 38 - 69
Dematha-Court 1
May 20, 2026 Bethel Academy vs St. Stephen’s & St. Agnes 52 - 36
Dematha-Court 2
May 20, 2026 Loyola Blakefield vs Colonels (Magruder) 56 - 62
Dematha-Court 1
May 20, 2026 Concordia Prep vs Greenbelt (Eleanor Roosevelt) 56 - 66
Dematha-Court 2
May 20, 2026 Swarmin’ Hornets (Damascus) vs GrindHouse (Huntingtown) 60 - 52
Dematha-Court 1
May 20, 2026 Potomac School vs Boys’ Latin 63 - 57
Dematha-Court 2
May 21, 2026 John Handley vs Heritage 67 - 93
Hayfield-Court 1
May 21, 2026 Riverside (VA) vs Virginia Academy 51 - 76
Hayfield-Court 2
May 21, 2026 Hawks (Hayfield) vs St. Stephen’s & St. Agnes 55 - 57
Hayfield-Court 1
May 21, 2026 Good Fellas (Oxon Hill) vs Flint Hill 55 - 76
Hayfield-Court 2
May 21, 2026 Purple Storm (DOZA) vs John Handley 92 - 94
Hayfield-Court 1
May 21, 2026 Riverside (VA) vs Heritage 62 - 85
Hayfield-Court 2
May 22, 2026 DeMatha vs Glenelg Country 90 - 56
Dematha-Court 1
May 22, 2026 Takoma Academy vs Severn 81 - 60
Dematha-Court 2
May 22, 2026 St. John’s DC vs Purple Storm (DOZA) 67 - 80
Dematha-Court 1
May 22, 2026 John Carroll vs Annapolis Area Christian 53 - 45
Dematha-Court 2
May 22, 2026 Loyola Blakefield vs So MD Christian 56 - 64
Dematha-Court 1
May 22, 2026 Gonzaga vs Potomac School 64 - 78
Dematha-Court 2
May 22, 2026 Annapolis Area Christian vs St. John’s DC 80 - 75
Dematha-Court 1
May 22, 2026 Greenbelt (Eleanor Roosevelt) vs John Carroll 61 - 57
Dematha-Court 2
May 26, 2026 Sandy Spring vs Bulldogs (Churchill) 57 - 42
Dematha-Court 1
May 26, 2026 Colonels (Magruder) vs Seahawks (South River) 57 - 55
Dematha-Court 2
May 26, 2026 John Handley vs Landon 36 - 80
Dematha-Court 1
May 26, 2026 South County vs The Brook (Springbrook) 52 - 49
Dematha-Court 2
May 26, 2026 Mustangs (Meade) vs Concordia Prep 67 - 75
Dematha-Court 1
May 26, 2026 Patriots (Wootton) vs GrindHouse (Huntingtown) 62 - 40
Dematha-Court 2
May 26, 2026 John Handley vs Bethel Academy 46 - 105
Dematha-Court 1
May 26, 2026 Bengals (Blake) vs Flint Hill 65 - 73
Dematha-Court 2
May 27, 2026 Seahawks (South River) vs Bengals (Blake) 66 - 80
Dematha-Court 1
May 27, 2026 Bullis vs Vikes (Whitman) 62 - 44
Dematha-Court 2
May 27, 2026 Good Counsel vs John Carroll 70 - 56
Dematha-Court 1
May 27, 2026 St. Mary’s Annapolis vs Greenbelt (Eleanor Roosevelt) 72 - 53
Dematha-Court 2
May 27, 2026 Tenley Tigers (Jackson Reed) vs Clinton Grace 71 - 66
Dematha-Court 1
May 27, 2026 Mustangs (Meade) vs Patriots (Wootton) 7:30 pm
Dematha-Court 2
May 27, 2026 Crofton vs JFK (Kennedy) 8:45 pm
Dematha-Court 1
May 27, 2026 Wildcats (WJ) vs Virginia Academy 8:45 pm
Dematha-Court 2
May 29, 2026 Good Counsel vs Wildcats (WJ) 5:00 pm
Dematha-Court 1
May 29, 2026 JFK (Kennedy) vs Coolidge 5:00 pm
Dematha-Court 2
May 29, 2026 John Carroll vs GrindHouse (Huntingtown) 5:00 pm
Annapolis-Court 1
May 29, 2026 Bruins (Broadneck) vs Clarksville (River Hill) 5:00 pm
Annapolis-Court 2
May 29, 2026 Boys’ Latin vs Heritage 6:15 pm
Dematha-Court 1
May 29, 2026 New Hope Academy vs Forest Park 6:15 pm
Dematha-Court 2
May 29, 2026 Annapolis Area Christian vs Crofton 6:15 pm
Annapolis-Court 1
May 29, 2026 Buccaneers (Kent Island) vs Bulldogs (Churchill) 6:15 pm
Annapolis-Court 2
May 29, 2026 Good Fellas (Oxon Hill) vs Greenbelt (Eleanor Roosevelt) 7:30 pm
Dematha-Court 1
May 29, 2026 Purple Storm (DOZA) vs The West (Northwest) 7:30 pm
Dematha-Court 2
May 29, 2026 GrindHouse (Huntingtown) vs Bruins (Broadneck) 7:30 pm
Annapolis-Court 1
May 29, 2026 Clarksville (River Hill) vs Screaming Eagles (Seneca V) 7:30 pm
Annapolis-Court 2
May 29, 2026 Gonzaga vs Heritage 8:45 pm
Dematha-Court 1
May 29, 2026 Forest Park vs Boys’ Latin 8:45 pm
Dematha-Court 2
May 29, 2026 Annapolis Area Christian vs Bulldogs (Churchill) 8:45 pm
Annapolis-Court 1
May 29, 2026 BCC vs Concordia Prep 8:45 pm
Annapolis-Court 2
May 30, 2026 Severn vs Colonels (Magruder) 10:00 am
DeMatha-Main
May 30, 2026 Loyola Blakefield vs JFK (Kennedy) 11:15 am
DeMatha-Main
May 30, 2026 Bullis vs Severn 12:30 pm
DeMatha-Main
May 30, 2026 Screaming Eagles (Seneca V) vs South County 1:45 pm
DeMatha-Main
May 30, 2026 Good Fellas (Oxon Hill) vs Bengals (Blake) 3:00 pm
DeMatha-Main
May 30, 2026 Landon vs South County 4:15 pm
DeMatha-Main
May 30, 2026 Patriots (Wootton) vs St. Mary’s Annapolis 5:30 pm
DeMatha-Main
May 30, 2026 Good Counsel vs BCC 6:45 pm
DeMatha-Main
May 31, 2026 Screaming Eagles (Seneca V) vs St. Mary’s Annapolis 10:00 am
DeMatha-Main
May 31, 2026 Takoma Academy vs Heritage 10:30 am
Hayfield-Court 1
May 31, 2026 Potomac (VA) vs RM 10:30 am
Hayfield-Court 2
May 31, 2026 Good Counsel vs Coolidge 11:15 am
DeMatha-Main
May 31, 2026 Purple Storm (DOZA) vs Cavaliers (CG Woodson) 11:45 am
Hayfield-Court 1
May 31, 2026 Severn vs Forest Park 11:45 am
Hayfield-Court 2
May 31, 2026 Spalding vs Potomac School 12:30 pm
DeMatha-Main
May 31, 2026 Hawks (Hayfield) vs Virginia Academy 1:00 pm
Hayfield-Court 1
May 31, 2026 Heritage vs Potomac (VA) 1:00 pm
Hayfield-Court 2
May 31, 2026 DeMatha vs Bullis 1:45 pm
DeMatha-Main
May 31, 2026 Good Fellas (Oxon Hill) vs Forest Park 2:15 pm
Hayfield-Court 1
May 31, 2026 Cavaliers (CG Woodson) vs St. Stephen’s & St. Agnes 2:15 pm
Hayfield-Court 2
May 31, 2026 New Hope Academy vs Bulldogs (Churchill) 3:00 pm
DeMatha-Main
May 31, 2026 Hawks (Hayfield) vs JFK (Kennedy) 3:30 pm
Hayfield-Court 1
May 31, 2026 Mustangs (Meade) vs Clarksville (River Hill) 3:30 pm
Hayfield-Court 2
May 31, 2026 Patriots (Wootton) vs Bruins (Broadneck) 4:15 pm
DeMatha-Main
May 31, 2026 Concordia Prep vs Vikes (Whitman) 4:45 pm
Hayfield-Court 1
May 31, 2026 Boys’ Latin vs St. John’s DC 4:45 pm
Hayfield-Court 2
May 31, 2026 New Hope Academy vs GrindHouse (Huntingtown) 5:30 pm
DeMatha-Main
May 31, 2026 The West (Northwest) vs Landon 6:45 pm
DeMatha-Main
June 1, 2026 DeMatha vs Coolidge 5:00 pm
Dematha-Court 1
June 1, 2026 Bengals (Blake) vs Mustangs (Meade) 5:00 pm
Dematha-Court 2
June 1, 2026 Clinton Grace vs Gonzaga 6:15 pm
Dematha-Court 1
June 1, 2026 Riverside (VA) vs Wildcats (WJ) 6:15 pm
Dematha-Court 2
June 1, 2026 Tenley Tigers (Jackson Reed) vs Bullis 7:30 pm
Dematha-Court 1
June 1, 2026 Concordia Prep vs The West (Northwest) 7:30 pm
Dematha-Court 2
June 1, 2026 Patriot vs BCC 8:45 pm
Dematha-Court 1
June 1, 2026 Riverside (VA) vs The Brook (Springbrook) 8:45 pm
Dematha-Court 2
June 4, 2026 Good Counsel vs RM 5:00 pm
Dematha-Court 1
June 4, 2026 Virginia Academy vs Vikes (Whitman) 5:00 pm
Dematha-Court 2
June 4, 2026 Colonels (Magruder) vs Buccaneers (Kent Island) 5:00 pm
Annapolis-Court 1
June 4, 2026 Mustangs (Meade) vs Severn 5:00 pm
Annapolis-Court 2
June 4, 2026 Heritage vs Bethel Academy 6:15 pm
Dematha-Court 1
June 4, 2026 Swarmin’ Hornets (Damascus) vs Sandy Spring 6:15 pm
Dematha-Court 2
June 4, 2026 John Carroll vs Bruins (Broadneck) 6:15 pm
Annapolis-Court 1
June 4, 2026 Wildcats (WJ) vs Crofton 6:15 pm
Annapolis-Court 2
June 4, 2026 Vikes (Whitman) vs Good Fellas (Oxon Hill) 7:30 pm
Dematha-Court 1
June 4, 2026 Gonzaga vs Tenley Tigers (Jackson Reed) 7:30 pm
Dematha-Court 2
June 4, 2026 Annapolis Area Christian vs Bengals (Blake) 7:30 pm
Annapolis-Court 1
June 4, 2026 Loyola Blakefield vs Severn 7:30 pm
Annapolis-Court 2
June 4, 2026 Swarmin’ Hornets (Damascus) vs Heritage 8:45 pm
Dematha-Court 1
June 4, 2026 Bulldogs (Churchill) vs Takoma Academy 8:45 pm
Dematha-Court 2
June 4, 2026 Spalding vs Clarksville (River Hill) 8:45 pm
Annapolis-Court 1
June 4, 2026 Bruins (Broadneck) vs Wildcats (WJ) 8:45 pm
Annapolis-Court 2
June 5, 2026 JFK (Kennedy) vs Gonzaga 5:00 pm
Dematha-Court 1
June 5, 2026 Bethel Academy vs BCC 5:00 pm
Dematha-Court 2
June 5, 2026 Patriots (Wootton) vs Greenbelt (Eleanor Roosevelt) 5:00 pm
Annapolis-Court 1
June 5, 2026 The Brook (Springbrook) vs Takoma Academy 5:00 pm
Annapolis-Court 2
June 5, 2026 Yorktown vs St. John’s DC 6:15 pm
Dematha-Court 1
June 5, 2026 Coolidge vs St. Stephen’s & St. Agnes 6:15 pm
Dematha-Court 2
June 5, 2026 Clinton Grace vs Seahawks (South River) 6:15 pm
Annapolis-Court 1
June 5, 2026 The West (Northwest) vs GrindHouse (Huntingtown) 6:15 pm
Annapolis-Court 2
June 5, 2026 Purple Storm (DOZA) vs Landon 7:30 pm
Dematha-Court 1
June 5, 2026 So MD Christian vs Bulldogs (Churchill) 7:30 pm
Dematha-Court 2
June 5, 2026 Annapolis Area Christian vs Good Fellas (Oxon Hill) 7:30 pm
Annapolis-Court 1
June 5, 2026 Greenbelt (Eleanor Roosevelt) vs Good Counsel 7:30 pm
Annapolis-Court 2
June 5, 2026 St. Stephen’s & St. Agnes vs Flint Hill 8:45 pm
Dematha-Court 1
June 5, 2026 Screaming Eagles (Seneca V) vs Yorktown 8:45 pm
Dematha-Court 2
June 5, 2026 John Carroll vs Seahawks (South River) 8:45 pm
Annapolis-Court 1
June 5, 2026 Spalding vs New Hope Academy 8:45 pm
Annapolis-Court 2
June 6, 2026 Glenelg Country vs RM 10:00 am
Annapolis-Court 1
June 6, 2026 Mustangs (Meade) vs Crofton 10:00 am
Annapolis-Court 2
June 6, 2026 Spalding vs Bullis 11:15 am
Annapolis-Court 1
June 6, 2026 Clarksville (River Hill) vs Loyola Blakefield 11:15 am
Annapolis-Court 2
June 6, 2026 Patriot vs Cavaliers (CG Woodson) 12:00 pm
Hayfield-Court 1
June 6, 2026 South County vs Potomac School 12:00 pm
Hayfield-Court 2
June 6, 2026 RM vs Mustangs (Meade) 12:30 pm
Annapolis-Court 1
June 6, 2026 Buccaneers (Kent Island) vs Crofton 12:30 pm
Annapolis-Court 2
June 6, 2026 Bengals (Blake) vs Purple Storm (DOZA) 1:15 pm
Hayfield-Court 1
June 6, 2026 Sandy Spring vs Flint Hill 1:15 pm
Hayfield-Court 2
June 6, 2026 Clinton Grace vs Glenelg Country 1:45 pm
Annapolis-Court 1
June 6, 2026 Loyola Blakefield vs GrindHouse (Huntingtown) 1:45 pm
Annapolis-Court 2
June 6, 2026 Potomac (VA) vs Cavaliers (CG Woodson) 2:30 pm
Hayfield-Court 1
June 6, 2026 Patriot vs South County 2:30 pm
Hayfield-Court 2
June 6, 2026 Buccaneers (Kent Island) vs Clarksville (River Hill) 3:00 pm
Annapolis-Court 1
June 6, 2026 St. Mary’s Annapolis vs Colonels (Magruder) 3:00 pm
Annapolis-Court 2
June 6, 2026 Hawks (Hayfield) vs Potomac School 3:45 pm
Hayfield-Court 1
June 6, 2026 Riverside (VA) vs Patriots (Wootton) 3:45 pm
Hayfield-Court 2
June 6, 2026 Virginia Academy vs Potomac (VA) 5:00 pm
Hayfield-Court 1
June 6, 2026 Forest Park vs Sandy Spring 5:00 pm
Hayfield-Court 2
June 6, 2026 BCC vs Riverside (VA) 6:15 pm
Hayfield-Court 1
June 6, 2026 Hawks (Hayfield) vs Bulldogs (Churchill) 6:15 pm
Hayfield-Court 2
June 6, 2026 Landon vs Coolidge 7:30 pm
Hayfield-Court 1
June 6, 2026 Forest Park vs The Brook (Springbrook) 7:30 pm
Hayfield-Court 2
June 7, 2026 Landon vs Screaming Eagles (Seneca V) 10:00 am
DeMatha-Main
June 7, 2026 Yorktown vs Colonels (Magruder) 10:30 am
Hayfield-Court 1
June 7, 2026 St. Stephen’s & St. Agnes vs Virginia Academy 10:30 am
Hayfield-Court 2
June 7, 2026 Purple Storm (DOZA) vs Bullis 11:15 am
DeMatha-Main
June 7, 2026 Potomac (VA) vs Bulldogs (Churchill) 11:45 am
Hayfield-Court 1
June 7, 2026 So MD Christian vs The West (Northwest) 11:45 am
Hayfield-Court 2
June 7, 2026 Screaming Eagles (Seneca V) vs New Hope Academy 12:30 pm
DeMatha-Main
June 7, 2026 Clinton Grace vs John Handley 1:00 pm
Hayfield-Court 1
June 7, 2026 Good Fellas (Oxon Hill) vs Yorktown 1:00 pm
Hayfield-Court 2
June 7, 2026 Bengals (Blake) vs Takoma Academy 1:45 pm
DeMatha-Main
June 7, 2026 The West (Northwest) vs Flint Hill 2:15 pm
Hayfield-Court 1
June 7, 2026 Potomac (VA) vs So MD Christian 2:15 pm
Hayfield-Court 2
June 7, 2026 BCC vs New Hope Academy 3:00 pm
DeMatha-Main
June 7, 2026 John Handley vs Potomac School 3:30 pm
Hayfield-Court 1
June 7, 2026 St. John’s DC vs Takoma Academy 4:15 pm
DeMatha-Main
June 8, 2026 Mustangs (Meade) vs Spalding 5:00 pm
Annapolis-Court 1
June 8, 2026 Seahawks (South River) vs Boys’ Latin 5:00 pm
Annapolis-Court 2
June 8, 2026 RM vs Sandy Spring 5:00 pm
Dematha-Court 1
June 8, 2026 Patriots (Wootton) vs The Brook (Springbrook) 5:00 pm
Dematha-Court 2
June 8, 2026 Bruins (Broadneck) vs Loyola Blakefield 6:15 pm
Annapolis-Court 1
June 8, 2026 Crofton vs Concordia Prep 6:15 pm
Annapolis-Court 2
June 8, 2026 Good Counsel vs South County 6:15 pm
Dematha-Court 1
June 8, 2026 Clarksville (River Hill) vs Swarmin’ Hornets (Damascus) 6:15 pm
Dematha-Court 2
June 8, 2026 Boys’ Latin vs Wildcats (WJ) 7:30 pm
Annapolis-Court 1
June 8, 2026 Severn vs Seahawks (South River) 7:30 pm
Annapolis-Court 2
June 8, 2026 St. Mary’s Annapolis vs JFK (Kennedy) 7:30 pm
Dematha-Court 1
June 8, 2026 The West (Northwest) vs Patriot 7:30 pm
Dematha-Court 2
June 8, 2026 Bruins (Broadneck) vs Glenelg Country 8:45 pm
Annapolis-Court 1
June 8, 2026 John Carroll vs Buccaneers (Kent Island) 8:45 pm
Annapolis-Court 2
June 8, 2026 Gonzaga vs Swarmin’ Hornets (Damascus) 8:45 pm
Dematha-Court 1
June 8, 2026 Vikes (Whitman) vs Coolidge 8:45 pm
Dematha-Court 2
June 9, 2026 Concordia Prep vs Buccaneers (Kent Island) 5:00 pm
Annapolis-Court 1
June 9, 2026 Bruins (Broadneck) vs St. Mary’s Annapolis 5:00 pm
Annapolis-Court 2
June 9, 2026 Sandy Spring vs Vikes (Whitman) 5:00 pm
Dematha-Court 1
June 9, 2026 The Brook (Springbrook) vs Greenbelt (Eleanor Roosevelt) 5:00 pm
Dematha-Court 2
June 9, 2026 John Carroll vs Screaming Eagles (Seneca V) 6:15 pm
Annapolis-Court 1
June 9, 2026 St. Stephen’s & St. Agnes vs St. John’s DC 6:15 pm
Annapolis-Court 2
June 9, 2026 Swarmin’ Hornets (Damascus) vs Severn 6:15 pm
Dematha-Court 1
June 9, 2026 RM vs Takoma Academy 6:15 pm
Dematha-Court 2
June 9, 2026 Loyola Blakefield vs Tenley Tigers (Jackson Reed) 7:30 pm
Annapolis-Court 1
June 9, 2026 South County vs Bengals (Blake) 7:30 pm
Annapolis-Court 2
June 9, 2026 Gonzaga vs New Hope Academy 7:30 pm
Dematha-Court 1
June 9, 2026 Greenbelt (Eleanor Roosevelt) vs Landon 7:30 pm
Dematha-Court 2
June 9, 2026 Bethel Academy vs St. John’s DC 8:45 pm
Annapolis-Court 1
June 9, 2026 GrindHouse (Huntingtown) vs Spalding 8:45 pm
Annapolis-Court 2
June 9, 2026 JFK (Kennedy) vs Patriots (Wootton) 8:45 pm
Dematha-Court 1
June 9, 2026 Boys’ Latin vs BCC 8:45 pm
Dematha-Court 2
June 10, 2026 DeMatha vs Clinton Grace 5:00 pm
Dematha-Court 1
June 10, 2026 Colonels (Magruder) vs Bullis 5:00 pm
Dematha-Court 2
June 10, 2026 Flint Hill vs Cavaliers (CG Woodson) 6:15 pm
Dematha-Court 1
June 10, 2026 Yorktown vs Riverside (VA) 6:15 pm
Dematha-Court 2
June 10, 2026 Glenelg Country vs Wildcats (WJ) 7:30 pm
Dematha-Court 1
June 10, 2026 Vikes (Whitman) vs Potomac School 7:30 pm
Dematha-Court 2
June 10, 2026 So MD Christian vs Yorktown 8:45 pm
Dematha-Court 1
June 10, 2026 Cavaliers (CG Woodson) vs Riverside (VA) 8:45 pm
Dematha-Court 2
June 16, 2026 Hawks (Hayfield) vs Cavaliers (CG Woodson) 5:00 pm
Hayfield-Court 1
June 16, 2026 Virginia Academy vs Forest Park 5:00 pm
Hayfield-Court 2
June 16, 2026 St. John’s DC vs JFK (Kennedy) 5:00 pm
Dematha-Court 1
June 16, 2026 St. Mary’s Annapolis vs Vikes (Whitman) 5:00 pm
Dematha-Court 2
June 16, 2026 St. Stephen’s & St. Agnes vs Patriot 6:15 pm
Hayfield-Court 1
June 16, 2026 Yorktown vs Flint Hill 6:15 pm
Hayfield-Court 2
June 16, 2026 Good Fellas (Oxon Hill) vs Colonels (Magruder) 6:15 pm
Dematha-Court 1
June 16, 2026 Buccaneers (Kent Island) vs Screaming Eagles (Seneca V) 6:15 pm
Dematha-Court 2
June 16, 2026 Hawks (Hayfield) vs Forest Park 7:30 pm
Hayfield-Court 1
June 16, 2026 Tenley Tigers (Jackson Reed) vs Cavaliers (CG Woodson) 7:30 pm
Hayfield-Court 2
June 16, 2026 Spalding vs The Brook (Springbrook) 7:30 pm
Dematha-Court 1
June 16, 2026 BCC vs Coolidge 7:30 pm
Dematha-Court 2
June 16, 2026 Bullis vs Gonzaga 8:45 pm
Hayfield-Court 1
June 16, 2026 Patriot vs Yorktown 8:45 pm
Hayfield-Court 2
June 16, 2026 RM vs Bethel Academy 8:45 pm
Dematha-Court 1
June 16, 2026 So MD Christian vs Swarmin’ Hornets (Damascus) 8:45 pm
Dematha-Court 2
June 17, 2026 DeMatha vs Purple Storm (DOZA) 5:00 pm
Dematha-Court 1
June 17, 2026 The West (Northwest) vs The Brook (Springbrook) 5:00 pm
Dematha-Court 2
June 17, 2026 Boys’ Latin vs RM 6:15 pm
Dematha-Court 1
June 17, 2026 Glenelg Country vs Clarksville (River Hill) 6:15 pm
Dematha-Court 2
June 17, 2026 DeMatha vs Spalding 7:30 pm
Dematha-Court 1
June 17, 2026 Buccaneers (Kent Island) vs Seahawks (South River) 7:30 pm
Dematha-Court 2
June 17, 2026 Tenley Tigers (Jackson Reed) vs Bethel Academy 8:45 pm
Dematha-Court 1
`;

const MONTHS = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

function parse(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const games = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateM = line.match(/^([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(.*)$/);
    if (!dateM) continue; // not a game line (likely a court line already consumed)
    const [, monName, dayStr, yearStr, rest0] = dateM;
    const month = MONTHS[monName];
    if (!month) continue;
    const iso = `${yearStr}-${String(month).padStart(2, "0")}-${String(+dayStr).padStart(2, "0")}`;

    let rest = rest0.trim();
    let homeScore = null, awayScore = null, time = null, status = "scheduled";
    const scoreM = rest.match(/\s+(\d{1,3})\s*-\s*(\d{1,3})\s*$/);
    const timeM = rest.match(/\s+(\d{1,2}:\d{2})\s*(am|pm)\s*$/i);
    if (scoreM) {
      homeScore = +scoreM[1];
      awayScore = +scoreM[2];
      status = "final";
      rest = rest.slice(0, scoreM.index).trim();
    } else if (timeM) {
      time = `${timeM[1]} ${timeM[2].toLowerCase()}`;
      rest = rest.slice(0, timeM.index).trim();
    }

    const vsM = rest.split(/\s+vs\.?\s+/i);
    if (vsM.length !== 2) { console.warn("Could not split matchup:", JSON.stringify(rest)); continue; }
    const home = vsM[0].trim();
    const away = vsM[1].trim();

    const court = (lines[i + 1] || "").trim();
    i++; // consume court line

    games.push({ date: iso, dateLabel: `${monName} ${+dayStr}, ${yearStr}`, home, away, homeScore, awayScore, time, court, status });
  }
  return games;
}

const games = parse(RAW);
const finals = games.filter((g) => g.status === "final").length;
const out = { season: "2026", source: "Capitol Hoops Summer League", games };
const dest = join(__dirname, "..", "src", "data", "schedule.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${games.length} games (${finals} final, ${games.length - finals} scheduled) -> ${dest}`);
