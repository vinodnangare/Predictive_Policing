// server/seed-officers.js
// Script to add sample officers to the database

const mongoose = require('mongoose');
const Police = require('./models/Police');

// Sample officers data
const sampleOfficers = [
  {
    email: 'john.doe@police.gov',
    password: 'officer123',
    name: 'John Doe',
    badgeNumber: 'P-1001',
    rank: 'Inspector',
    department: 'Criminal Investigation',
    phone: '+91-9876543210',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'sarah.johnson@police.gov',
    password: 'officer123',
    name: 'Sarah Johnson',
    badgeNumber: 'P-1002',
    rank: 'Sub-Inspector',
    department: 'Cyber Crime',
    phone: '+91-9876543211',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'michael.chen@police.gov',
    password: 'officer123',
    name: 'Michael Chen',
    badgeNumber: 'P-1003',
    rank: 'Inspector',
    department: 'Narcotics',
    phone: '+91-9876543212',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'priya.sharma@police.gov',
    password: 'officer123',
    name: 'Priya Sharma',
    badgeNumber: 'P-1004',
    rank: 'Assistant Sub-Inspector',
    department: 'Traffic',
    phone: '+91-9876543213',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'raj.patel@police.gov',
    password: 'officer123',
    name: 'Raj Patel',
    badgeNumber: 'P-1005',
    rank: 'Inspector',
    department: 'Special Operations',
    phone: '+91-9876543214',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'emily.davis@police.gov',
    password: 'officer123',
    name: 'Emily Davis',
    badgeNumber: 'P-1006',
    rank: 'Deputy Superintendent',
    department: 'Administration',
    phone: '+91-9876543215',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'vikram.singh@police.gov',
    password: 'officer123',
    name: 'Vikram Singh',
    badgeNumber: 'P-1007',
    rank: 'Sub-Inspector',
    department: 'Homicide',
    phone: '+91-9876543216',
    isActive: true,
    assignedCases: []
  },
  {
    email: 'lisa.wong@police.gov',
    password: 'officer123',
    name: 'Lisa Wong',
    badgeNumber: 'P-1008',
    rank: 'Inspector',
    department: 'Forensics',
    phone: '+91-9876543217',
    isActive: true,
    assignedCases: []
  }
];

async function seedOfficers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/predictive_policing', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Check if officers already exist
    const existingCount = await Police.countDocuments();
    console.log(`📊 Existing officers: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  Officers already exist in database');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('Do you want to clear existing officers and add new ones? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          await Police.deleteMany({});
          console.log('🗑️  Cleared existing officers');
          await insertOfficers();
        } else {
          console.log('❌ Skipping seed operation');
          process.exit(0);
        }
        readline.close();
      });
    } else {
      await insertOfficers();
    }

  } catch (err) {
    console.error('❌ Error seeding officers:', err);
    process.exit(1);
  }
}

async function insertOfficers() {
  try {
    // Insert sample officers
    const result = await Police.insertMany(sampleOfficers);
    console.log(`✅ Successfully added ${result.length} officers to the database`);
    
    console.log('\n📋 Officers List:');
    result.forEach((officer, index) => {
      console.log(`${index + 1}. ${officer.name} (${officer.badgeNumber}) - ${officer.rank}, ${officer.department}`);
    });

    console.log('\n🔐 All officers have password: officer123');
    console.log('📧 Login with any officer email (e.g., john.doe@police.gov)');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error inserting officers:', err);
    process.exit(1);
  }
}

// Run the seed script
seedOfficers();
