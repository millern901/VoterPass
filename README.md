# VoterPass
Welcome to VoterPass! This website is designed to create a virtual queue for voters on election day. An administrator can sign into the website to run the line. Voters can then check in and receive a callback time to return at and a ticket with a QR code. Once it is the callback time, the voter can return to the voting venue where the administrator will scan the voter's QR code ticket. The voter will then proceed to vote. 

## Motivation
VoterPass was created in order improve the voting experience and keep people safe. During election day, lines can be long and crowded, which is especially problematic during the COVID-19 crisis. By creating a virtual queue, people can move around and stand where they want. This helps maintain social distancing and overall gives a better voting experience.

## Tech/Framwork Used
Databases- MongoDB
Backend Development- Express
Frontend Development- EJS
Runtime Environment- NodeJS

## Features
The first feature is the ability to log in and activate the system. The administrator has the ability to log into the system and set up the queue initally. There are many features and settings they can adjust to suite their needs.

The first big feature is the ability to add voters to the virtual queue. By just tapping the "generate" button on the check in page, a voter is added to the queue and a ticket is generated for them with a QR code and callback time.

When the voter returns at their specified time, the ticket is scanned on the return page to confirm the voter is back at the right time. The voter can then proceed to vote.

## Installation
Use "npm install -i" to install proper dependencies. 

## Running the Application
Run in development mode: "npm run dev".

Run in release mode: "npm run start".

## Credits
Created by Nicholas Miller, Grace Wilcox, Varun Puri, and Kyle Sousa

