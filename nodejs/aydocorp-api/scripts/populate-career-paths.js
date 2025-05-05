// populate-career-paths.js
// Script to populate the database with certification and rank information

const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:8080';

// Get auth token
async function getAuthToken() {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username: process.env.ADMIN_USERNAME,
            password: process.env.ADMIN_PASSWORD
        });
        return response.data.token;
    } catch (error) {
        console.error('Error getting auth token:', error.message);
        throw error;
    }
}

// General Certifications
const generalCertifications = [
    {
        name: "Flight Patrol (FP)",
        description: "Trainee demonstrates the ability to have adequate awareness skills and the ability to perform offensive and defensive security operations.",
        requirements: [
            "Knows how to scan and target",
            "Knows how to switch and set fire-groups",
            "Has a basic understanding of ship components and weapons (i.e. the difference of the effects ballistic weapons have vs laser ones)",
            "Knows how and when to use countermeasures",
            "Knows how to use missiles",
            "Is able to put weapons on target with effectiveness",
            "Is able to follow positioning commands and operate as a team player without devolving into lone-wolf behavior"
        ],
        benefits: ["Qualifies for security operations"]
    },
    {
        name: "Large Ship Flight (LSF)",
        description: "Trainee demonstrates the ability to safely fly and land a large ship to and from a space station and landing zone.",
        requirements: [
            "Trainee needs the small ship cert in order to obtain this one",
            "The only item to note is that the trainee is able to deal with the ungainly nature of larger ships as opposed to smaller ones; no real special training required other than a review of the proper skills gone over in the small ship cert training"
        ],
        benefits: ["Qualifies to pilot large ships"]
    },
    {
        name: "Small Ship Flight (SSF)",
        description: "Trainee demonstrates the ability to safely fly and land a small ship to and from a space station and landing zone.",
        requirements: [
            "Can turn on and off the power and engines",
            "Has a basic understanding of ship MFDs and switching between them",
            "Can turn the ship lights on and off",
            "Knows how to contact the ATC with keybindings, the mobiGlass, and MFD",
            "Can properly lift off and land (while also using VTOL if applicable, as well as extending/retracting landing gear at the appropriate times)",
            "Knows how to scan",
            "Has general basic awareness"
        ],
        benefits: ["Qualifies to pilot small ships", "Required for intern evaluation"]
    },
    {
        name: "Basic Firearms (BF)",
        description: "Trainee demonstrates the ability to load/reload a firearm as well as being able to properly shoot at a target.",
        requirements: [
            "Knows where to obtain weapons",
            "Knows how to equip ammo",
            "Knows how to equip weapon",
            "Can properly load the weapon and shoot at target",
            "Is able to reload and consolidate mags"
        ],
        benefits: ["Qualifies for armed operations", "Required for intern evaluation"]
    },
    {
        name: "Ground Patrol (GP)",
        description: "Trainee demonstrates the ability to have adequate awareness skills and the ability to perform offensive and defensive security operations.",
        requirements: [
            "Able to follow chain of command",
            "Understands and adheres to key squad roles (Leader/officer, Pointman, Assault, Machine-gunner / support, Grenadier / heavy weapons specialist, Marksman, Medic)",
            "Is able to perform basic tactical maneuvers (Cover / suppression, Moving as a unit in formation, Basic CQB)",
            "Keeps in mind to not flag friendlies and holding weapon lowered when not in active combat"
        ],
        benefits: ["Qualifies for ground security operations"]
    },
    {
        name: "Turret Operator (TO)",
        description: "Trainee demonstrates the ability to operate a turret with adequate performance.",
        requirements: [
            "Knows to turn on turret",
            "Knows how to switch modes (e.g. gyro mode)",
            "Is able to target and switch targets quickly",
            "Is able to listen to pilot's commands during chaotic moments"
        ],
        benefits: ["Qualifies to operate ship turrets", "Required for intern evaluation"]
    },
    {
        name: "Basic First-Aid (BFA)",
        description: "Trainee demonstrates the ability to use the medpen to heal and revive.",
        requirements: [
            "Should know what the medpen looks like (red injector) and how to equip it",
            "Learns how to inject oneself to heal, as well as to inject others to heal and/or revive them"
        ],
        benefits: ["Qualifies for basic medical duties", "Required for intern evaluation"]
    },
    {
        name: "First Responder (FR)",
        description: "Trainee demonstrates the ability to use all of the medical injectors for their appropriate usage as well as using the med-gun.",
        requirements: [
            "Has understanding of what all injectors/medications look like and what they do",
            "Is able to use the proper medication for the needed injury",
            "Knows how to use the med-gun in lieu of carrying individual injectors"
        ],
        benefits: ["Qualifies for advanced medical duties"]
    },
    {
        name: "Multi-tool Usage (MT)",
        description: "Trainee demonstrates the ability to use the multi-tool in its various capacities.",
        requirements: [
            "Is aware of the various attachments for the multi-tool and what they're used for",
            "Is aware of the dedicated salvage/repair and tractor beam tools",
            "Demonstrates the ability to switch out attachment heads"
        ],
        benefits: ["Qualifies for tool-based operations", "Required for intern evaluation"]
    }
];

// AydoExpress Certifications
const aydoExpressCertifications = [
    {
        name: "Cargo Handler (CH)",
        description: "Trainee demonstrates the ability to move around cargo in an orderly and safe fashion.",
        requirements: [
            "Knows the limits of the tractor beam devices and appropriate use cases for them are (including the ATLS suit)",
            "Learns appropriate handling of cargo when working alone or with others; safety is prioritized, as well as efficiency",
            "Organization skills are a must, it's not just about throwing boxes wherever"
        ],
        benefits: ["Qualifies for cargo handling operations"]
    },
    {
        name: "Transporter (TR)",
        description: "Trainee demonstrates the ability to move around passengers in a ship or ground vehicle in an orderly and safe fashion.",
        requirements: [
            "Is able to direct passengers to the appropriate seating in a firm manner to encourage timely departures",
            "Is able to fly the ship in a careful and steady manner to avoid standing passengers from falling down [too much] as well as avoiding heavy Gs",
            "Has impeccable landing and takeoff skills for the smoothest flights possible, as well as quickly being able to determine flat [enough] landing spots to help ensure that"
        ],
        benefits: ["Qualifies for passenger transport operations"]
    },
    {
        name: "High Risk Transporter (HRT)",
        description: "Trainee demonstrates the ability to transport passengers and/or vehicles in dangerous environments.",
        requirements: [
            "Must be able to multi-task and receive instruction on the fly depending on changing conditions in the hazard area",
            "Landings and takeoffs are able to be conducted in a speedy, but still safe, manner"
        ],
        benefits: ["Qualifies for high-risk transport operations"]
    },
    {
        name: "Trading & Sourcing Specialist (TSS)",
        description: "Trainee demonstrates the ability to look up trading and item location data and have familiarization with the most common websites/tools that display such information.",
        requirements: [
            "Has a basic understanding of what commodities are and where to purchase/sell them",
            "Has a basic understanding of profit margins and that more expensive goods don't necessarily mean greater profits",
            "Learns about the more common tools/websites to figure out pricing of commodities and where best to source and sell them",
            "Is made aware of the niche player to player item market and its growing and future importance"
        ],
        benefits: ["Qualifies for trading operations"]
    },
    {
        name: "Surveyor (S)",
        description: "Trainee demonstrates the ability to seek out ideal land and resources.",
        requirements: [
            "Has the capacity to be good with remembering locations and knowing the \"lay of the land\" (essentially, knows specific regions of space…preferably an entire star system…quite well)",
            "Learns about the more common tools/websites to use for helping in finding locations",
            "Has the ability to concisely log location info to be able to share with others",
            "Is aware that the future of surveying will involve base-building and thus surveying activities will need to be done with that in mind"
        ],
        benefits: ["Qualifies for surveying operations"]
    }
];

// Empyrion Industries Certifications
const empyrionCertifications = [
    {
        name: "Ship Mining (SM)",
        description: "Trainee demonstrates the ability to successfully use a ship mining laser to crack a rock and then to extract the materials.",
        requirements: [
            "Knows how to active mining mode and switch between fracturing and extraction",
            "Understands how to raise power level of laser to successfully fracture rock",
            "Is aware of the more common sites to get information on ores and refineries to maximize profits"
        ],
        benefits: ["Qualifies for ship mining operations"]
    },
    {
        name: "Ground Mining (GM)",
        description: "Trainee demonstrates the ability to successfully use a vehicle/exosuit/handheld mining laser to crack a rock and then to extract the materials.",
        requirements: [
            "Same as above for ship mining"
        ],
        benefits: ["Qualifies for ground mining operations"]
    },
    {
        name: "Ship & Handheld Salvaging (SHS)",
        description: "Trainee demonstrates the ability to successfully use a salvage beam to strip the hull of a ship/vehicle and then to 'munch' the ship after.",
        requirements: [
            "Knows how to active salvaging mode and to switch between the tractor beam and salvaging beam",
            "Is aware of general guidelines for hull-stripping (being slow and steady)",
            "Understands how to 'hull munch' after the ship/vehicle has been stripped"
        ],
        benefits: ["Qualifies for salvaging operations"]
    },
    {
        name: "Hand Repair (HR)",
        description: "Trainee demonstrates the ability to load the repair device with material in order to make patch repairs on a ship/vehicle.",
        requirements: [
            "Uses understanding of how multitools work in order to load it with a can of reclaimed material and then spray it on the part of their ship/vehicle they want to repair"
        ],
        benefits: ["Qualifies for repair operations"]
    },
    {
        name: "Refueling (R)",
        description: "Trainee demonstrates the ability to successfully refuel a ship as well as being able to give clear and concise instructions to those refueling to help aid that process.",
        requirements: [
            "Has awareness of the different nozzle and tank types",
            "Knows how to start the initiation/docking process for refueling recipient",
            "Is able to manage the MFD to properly refuel the ship without dumping fuel outside",
            "Is able to personally dock and refuel oneself to be able to direct to others what they need to do to refuel"
        ],
        benefits: ["Qualifies for refueling operations"]
    },
    {
        name: "Towing - Single (TS)",
        description: "Trainee demonstrates the ability to safely tow a ship with the SRV.",
        requirements: [
            "Has the awareness skills to tow a ship without hitting things with it",
            "Is able to tow a ship into QT",
            "Can deposit a ship without damaging it"
        ],
        benefits: ["Qualifies for single-ship towing operations"]
    },
    {
        name: "Towing - Multi (TM)",
        description: "Trainee demonstrates the ability to safely tow a ship with an SRV alongside other towers.",
        requirements: [
            "Same as above, with the only difference being the ability for good communication with the other towers and keeping their pathing in relatively straight, smooth lines to avoid dropping their load and/or hitting things with it"
        ],
        benefits: ["Qualifies for multi-ship towing operations"]
    }
];

// Rank Hierarchy
const rankHierarchy = [
    {
        title: "PROSPECTIVE HIRE",
        description: "Someone potentially interested in joining. Required to be around for at least two weeks before becoming an actual member, but this period can be longer in case one needs more time to make the decision. There are no requirements other than a good temperament and being 18+ years of age to join!",
        level: 0,
        paygrade: "N/A",
        responsibilities: ["Learn about the organization", "Decide if you want to join"],
        requirements: ["Good temperament", "18+ years of age"]
    },
    {
        title: "INTERN",
        description: "The first real rank, an intern signifies becoming a fully-fledged member of AydoCorp. As this is a transitional rank, we encourage interns to move up to the next rank within two weeks of joining or at least as soon as they are able.",
        level: 1,
        paygrade: "65k per hour",
        responsibilities: ["Learn the basics", "Work towards employee status"],
        requirements: ["Completed prospective hire period"]
    },
    {
        title: "FREELANCER",
        description: "Someone who has freelancer status is one that's been an intern for more than a month or so but hasn't yet made the proper steps to become an employee. We encourage members to not hold this rank, but we understand that IRL circumstances may make that difficult. Org leadership will move interns to this rank at their discretion if it's been viewed that one has been an intern for an overly long period.",
        level: 1.5,
        paygrade: "65k per hour",
        responsibilities: ["Work towards employee status"],
        requirements: ["Intern for more than a month"]
    },
    {
        title: "EMPLOYEE",
        description: "Becoming an employee means proving that one knows the basics of how to play the game and thus know how to handle oneself in addition to becoming a member of a subsidiary.",
        level: 2,
        paygrade: "80k per hour",
        responsibilities: ["Participate in subsidiary activities", "Continue learning and improving"],
        requirements: ["Demonstrate basic game knowledge", "Join a subsidiary"]
    },
    {
        title: "SENIOR EMPLOYEE",
        description: "This rank is for employees who have attained the 4th rank in any given subsidiary, and/or have been employees for more than 2 years (whichever comes first). These employees have shown themselves both competent in their chosen area of gameplay, as well as showing a great amount of activity and/or seniority within the organization. Those at this stage are seasoned members and trusted with more responsibilities during operations.",
        level: 3,
        paygrade: "100k per hour",
        responsibilities: ["Take on more responsibilities during operations", "Mentor newer members"],
        requirements: ["Attain 4th rank in a subsidiary OR", "Be an employee for more than 2 years"]
    },
    {
        title: "SUPERVISOR",
        description: "Being the last 'standard' rank, this is a fusion between normal membership and leadership. To get this promotion, a Senior Employee must achieve the 5th rank in a subsidiary. Supervisors are given the ability to lead small groups of members during operations; this authority does not carry over outside of operations unless otherwise specified. A member achieving this promotion does not need to open themselves up to be a leader if they do not wish to, but they are always given the option if they decide later on that they would like to be more active and involved in things.",
        level: 4,
        paygrade: "120k per hour",
        responsibilities: ["Lead small groups during operations", "Provide guidance to members"],
        requirements: ["Achieve 5th rank in a subsidiary"]
    },
    {
        title: "MANAGER",
        description: "The first 'true' leadership rank, managers are members that show more commitment than on average as a baseline for even being considered. Managers support subsidiary directors in running things, which can include being given a specific role to play or at the very least help share the burden of leadership in a more general capacity. This position requires one to achieve the 7th rank in a subsidiary. In addition, a manager needs to have been a member for a minimum of six months before being able to be considered. Those of this rank hold minimal moderation capabilities on the server, but regardless are representatives of leadership and as such should be listened to.",
        level: 5,
        paygrade: "150k per hour",
        responsibilities: ["Support subsidiary directors", "Help with leadership tasks", "Moderate server (limited)"],
        requirements: ["Achieve 7th rank in a subsidiary", "Be a member for at least 6 months"]
    },
    {
        title: "DIRECTOR",
        description: "One of the most pivotal positions in the organization, directors are directly appointed and approved by the board to run subsidiaries and a small number of alternative roles. Ranks of supervisor and up are allowed to apply for a directorship, but being a manager is preferred with a minimum of 6 months previous membership required to even be considered. Directors are the go-to for all subsidiary-related concerns, and they are the ones that members will be interacting with the most for activities and events. Those of this rank also hold higher levels of moderation abilities than managers.",
        level: 6,
        paygrade: "250k per hour",
        responsibilities: ["Run subsidiaries", "Organize activities and events", "Moderate server (advanced)"],
        requirements: ["Be a supervisor or higher (manager preferred)", "Be a member for at least 6 months", "Be appointed by the board"]
    },
    {
        title: "BOARD MEMBER",
        description: "As the highest position in the org, board members hold full admin privileges and hold immense responsibility to AydoCorp. The CEO has the wherewithal to appoint a member for consideration, with a unanimous vote being needed by the rest of board members for acceptance. Board members are directly involved in the inner workings of the organization and commit a great deal of time and energy in how things are run. This position requires a lot of personal time spent in crafting the organization to its fullest potential and should not be entered into lightly.",
        level: 7,
        paygrade: "420k per hour",
        responsibilities: ["Oversee the entire organization", "Make high-level decisions", "Administer the server"],
        requirements: ["Be appointed by the CEO", "Receive unanimous approval from other board members"]
    }
];

// Career Paths
const careerPaths = [
    {
        department: "General",
        description: "The General career path includes certifications that are applicable to all members regardless of their subsidiary.",
        ranks: rankHierarchy,
        certifications: generalCertifications,
        trainingGuides: []
    },
    {
        department: "AydoExpress",
        description: "AydoExpress deals with cargo hauling and personnel transport. This career path focuses on logistics, trading, and transportation.",
        ranks: rankHierarchy,
        certifications: aydoExpressCertifications,
        trainingGuides: []
    },
    {
        department: "Empyrion Industries",
        description: "Empyrion Industries deals with industrial gameplay to sustain the organization with resources and profits. This career path focuses on mining, salvaging, and refueling.",
        ranks: rankHierarchy,
        certifications: empyrionCertifications,
        trainingGuides: []
    }
];

// Create career paths
async function createCareerPaths() {
    try {
        const token = await getAuthToken();
        
        for (const careerPath of careerPaths) {
            console.log(`Creating career path: ${careerPath.department}`);
            
            try {
                const response = await axios.post(
                    `${API_BASE_URL}/api/employee-portal/career-paths`,
                    careerPath,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        }
                    }
                );
                
                console.log(`Created career path: ${response.data.department}`);
            } catch (error) {
                if (error.response && error.response.status === 400 && error.response.data.message.includes('already exists')) {
                    console.log(`Career path ${careerPath.department} already exists. Skipping.`);
                } else {
                    console.error(`Error creating career path ${careerPath.department}:`, error.message);
                }
            }
        }
        
        console.log('All career paths created successfully!');
    } catch (error) {
        console.error('Error in createCareerPaths:', error.message);
    }
}

// Run the script
createCareerPaths();