const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Lead = require('../models/Lead');
const timelineService = require('../services/timelineService');

const ConversionService = require('../services/conversionService');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const TimelineEvent = require('../models/TimelineEvent');

const seedDatabase = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Database connected for seeding');

    // Reset database for clean seed
    await Promise.all([
      User.deleteMany({}),
      Lead.deleteMany({}),
      Customer.deleteMany({}),
      Deal.deleteMany({}),
      Activity.deleteMany({}),
      Notification.deleteMany({}),
      TimelineEvent.deleteMany({})
    ]);
    console.log('🧹 Cleaned existing database collections');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@crm.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    // 1. Seed Admin
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      admin = new User({
        name: 'System Admin',
        email: adminEmail,
        passwordHash: adminPassword,
        role: 'admin',
        isActive: true
      });
      await admin.save();
      console.log('👤 Admin user created');
    }

    // 2. Seed Sales Manager
    let manager = await User.findOne({ email: 'manager1@crm.com' });
    if (!manager) {
      manager = new User({
        name: 'Manager Bob',
        email: 'manager1@crm.com',
        passwordHash: 'Manager@12345',
        role: 'sales_manager',
        isActive: true
      });
      await manager.save();
      console.log('👤 Sales Manager created');
    }

    // 3. Seed Sales Executives (reporting to Manager Bob)
    let exec1 = await User.findOne({ email: 'exec1@crm.com' });
    if (!exec1) {
      exec1 = new User({
        name: 'Executive Alice',
        email: 'exec1@crm.com',
        passwordHash: 'Exec@12345',
        role: 'sales_executive',
        managerId: manager._id,
        isActive: true
      });
      await exec1.save();
      console.log('👤 Sales Executive 1 (Alice) created');
    }

    let exec2 = await User.findOne({ email: 'exec2@crm.com' });
    if (!exec2) {
      exec2 = new User({
        name: 'Executive Charlie',
        email: 'exec2@crm.com',
        passwordHash: 'Exec@12345',
        role: 'sales_executive',
        managerId: manager._id,
        isActive: true
      });
      await exec2.save();
      console.log('👤 Sales Executive 2 (Charlie) created');
    }

    // 4. Seed Sample Leads
    const leadCount = await Lead.countDocuments();
    if (leadCount === 0) {
      const sampleLeads = [
        {
          name: 'TechCorp Solutions',
          email: 'contact@techcorp.com',
          phone: '+1 555-0101',
          company: 'TechCorp Inc',
          source: 'website',
          status: 'new',
          priority: 'high',
          assignedTo: exec1._id,
          createdBy: admin._id
        },
        {
          name: 'Global Logistics Ltd',
          email: 'info@globallogistics.com',
          phone: '+1 555-0102',
          company: 'Global Logistics',
          source: 'referral',
          status: 'contacted',
          priority: 'medium',
          assignedTo: exec1._id,
          createdBy: manager._id
        },
        {
          name: 'Innovate AI Labs',
          email: 'hello@innovateai.com',
          phone: '+1 555-0103',
          company: 'Innovate AI',
          source: 'social_media',
          status: 'qualified',
          priority: 'high',
          assignedTo: exec2._id,
          createdBy: admin._id
        },
        {
          name: 'Sunrise Energy Systems',
          email: 'sales@sunriseenergy.com',
          phone: '+1 555-0104',
          company: 'Sunrise Energy',
          source: 'email',
          status: 'new',
          priority: 'low',
          assignedTo: exec2._id,
          createdBy: manager._id
        },
        {
          name: 'Apex FinTech Services',
          email: 'partner@apexfintech.com',
          phone: '+1 555-0105',
          company: 'Apex FinTech',
          source: 'phone',
          status: 'unqualified',
          priority: 'medium',
          assignedTo: manager._id,
          createdBy: admin._id
        },
        {
          name: 'Omni Health Systems',
          email: 'care@omnihealth.com',
          phone: '+1 555-0106',
          company: 'Omni Health',
          source: 'website',
          status: 'contacted',
          priority: 'high',
          assignedTo: exec1._id,
          createdBy: exec1._id
        }
      ];

      for (const leadData of sampleLeads) {
        const lead = new Lead(leadData);
        await lead.save();
        await timelineService.logEvent({
          relatedTo: { kind: 'Lead', item: lead._id },
          action: 'created',
          meta: { name: lead.name, status: lead.status },
          performedBy: leadData.createdBy
        });
      }
      console.log(`📋 Seeded ${sampleLeads.length} sample leads with timeline events`);
    }

    // 5. Seed Customer & Deal Conversions
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      const techCorpLead = await Lead.findOne({ name: 'TechCorp Solutions' });
      const innovateLead = await Lead.findOne({ name: 'Innovate AI Labs' });

      if (techCorpLead) {
        await ConversionService.convertLead(
          techCorpLead._id.toString(),
          {
            deal: {
              title: 'TechCorp Enterprise License',
              value: 45000,
              expectedClosingDate: '2026-11-15'
            }
          },
          { id: exec1._id.toString(), role: exec1.role }
        );
      }

      if (innovateLead) {
        const result = await ConversionService.convertLead(
          innovateLead._id.toString(),
          {
            deal: {
              title: 'Innovate AI Cloud Platform',
              value: 80000,
              expectedClosingDate: '2026-10-01'
            }
          },
          { id: exec2._id.toString(), role: exec2.role }
        );

        if (result.deal) {
          // Advance deal to won
          const DealService = require('../services/dealService');
          await DealService.updateDealStage(
            result.deal._id.toString(),
            'discovery',
            { id: exec2._id.toString(), role: exec2.role }
          );
          await DealService.updateDealStage(
            result.deal._id.toString(),
            'proposal',
            { id: exec2._id.toString(), role: exec2.role }
          );
          await DealService.updateDealStage(
            result.deal._id.toString(),
            'negotiation',
            { id: exec2._id.toString(), role: exec2.role }
          );
          await DealService.updateDealStage(
            result.deal._id.toString(),
            'won',
            { id: exec2._id.toString(), role: exec2.role }
          );
        }
      }

      console.log('🤝 Seeded sample converted customers and pipeline deals');
    }

    // 6. Seed Sample Activities
    const activityCount = await Activity.countDocuments();
    if (activityCount === 0) {
      const globalLead = await Lead.findOne({ name: 'Global Logistics Ltd' });
      const omniLead = await Lead.findOne({ name: 'Omni Health Systems' });
      const techCorpCustomer = await Customer.findOne({ name: 'TechCorp Solutions' });
      const techCorpDeal = await Deal.findOne({ title: 'TechCorp Enterprise License' });

      const now = new Date();
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const upcoming12h = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours from now
      const future5d = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      const sampleActivities = [
        {
          type: 'meeting',
          relatedTo: { kind: 'Lead', item: globalLead ? globalLead._id : admin._id },
          assignedTo: exec1._id,
          dueDate: pastDate,
          status: 'completed',
          completedAt: pastDate,
          notes: 'Initial discovery call held successfully'
        },
        {
          type: 'call',
          relatedTo: { kind: 'Lead', item: omniLead ? omniLead._id : admin._id },
          assignedTo: exec1._id,
          dueDate: pastDate, // Overdue!
          status: 'pending',
          notes: 'Follow-up call to review software requirements'
        },
        {
          type: 'demo',
          relatedTo: { kind: 'Deal', item: techCorpDeal ? techCorpDeal._id : admin._id },
          assignedTo: exec1._id,
          dueDate: upcoming12h, // Upcoming in 8h!
          status: 'pending',
          notes: 'Live product demo with executive team'
        },
        {
          type: 'reminder',
          relatedTo: { kind: 'Customer', item: techCorpCustomer ? techCorpCustomer._id : admin._id },
          assignedTo: exec2._id,
          dueDate: future5d,
          status: 'pending',
          notes: 'Quarterly review check-in'
        }
      ];

      for (const actData of sampleActivities) {
        const ActivityService = require('../services/activityService');
        await ActivityService.createActivity(actData, { id: admin._id.toString(), role: 'admin' });
      }

      console.log(`⏱️ Seeded ${sampleActivities.length} sample activities (overdue, upcoming, completed)`);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 Seed Completed Successfully! Available Users:');
    console.log(`   Admin:     ${adminEmail}  | Password: ${adminPassword}`);
    console.log(`   Manager:   manager1@crm.com | Password: Manager@12345`);
    console.log(`   Exec 1:    exec1@crm.com    | Password: Exec@12345`);
    console.log(`   Exec 2:    exec2@crm.com    | Password: Exec@12345`);
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
    process.exit(0);
  }
};

seedDatabase();
