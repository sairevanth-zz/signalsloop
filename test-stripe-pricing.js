#!/usr/bin/env node

/**
 * Stripe Pricing Verification Script
 * 
 * This script helps verify that your Stripe annual pricing is configured correctly.
 * Run this script to test your Stripe integration.
 * 
 * Usage: node test-stripe-pricing.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripePricing() {
  console.log('🔍 Testing Stripe Pricing Configuration...\n');

  try {
    // Check if Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY environment variable not set');
      console.log('Please set your Stripe secret key in your environment variables');
      return;
    }

    console.log('✅ Stripe secret key found');

    // Fetch all active prices
    console.log('📋 Fetching active prices from Stripe...');
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });

    console.log(`Found ${prices.data.length} active prices\n`);

    // Analyze pricing
    const monthlyPrices = [];
    const annualPrices = [];
    const proPrices = [];

    prices.data.forEach(price => {
      const product = price.product;
      const isPro = product.name?.toLowerCase().includes('pro') || 
                   product.description?.toLowerCase().includes('pro');
      
      if (isPro) {
        proPrices.push(price);
        
        if (price.recurring?.interval === 'month') {
          monthlyPrices.push(price);
        } else if (price.recurring?.interval === 'year') {
          annualPrices.push(price);
        }
      }
    });

    // Display results
    console.log('🎯 Pro Plan Analysis:');
    console.log(`Found ${proPrices.length} Pro-related prices\n`);

    if (monthlyPrices.length > 0) {
      console.log('📅 Monthly Pricing:');
      monthlyPrices.forEach(price => {
        console.log(`  - ${price.product.name}: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring.interval}`);
        console.log(`    Price ID: ${price.id}`);
      });
      console.log('');
    }

    if (annualPrices.length > 0) {
      console.log('📅 Annual Pricing:');
      annualPrices.forEach(price => {
        console.log(`  - ${price.product.name}: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring.interval}`);
        console.log(`    Price ID: ${price.id}`);
      });
      console.log('');
    }

    // Calculate discount
    if (monthlyPrices.length > 0 && annualPrices.length > 0) {
      const monthlyPrice = monthlyPrices[0];
      const annualPrice = annualPrices[0];
      
      const monthlyAnnual = monthlyPrice.unit_amount * 12;
      const actualAnnual = annualPrice.unit_amount;
      const discount = ((monthlyAnnual - actualAnnual) / monthlyAnnual * 100);
      
      console.log('💰 Discount Analysis:');
      console.log(`  Monthly × 12: $${(monthlyAnnual / 100).toFixed(2)}`);
      console.log(`  Annual price: $${(actualAnnual / 100).toFixed(2)}`);
      console.log(`  Discount: ${discount.toFixed(1)}%\n`);
    }

    // Test API endpoint simulation
    console.log('🔧 Testing API Endpoint Logic:');
    
    const monthlyPro = prices.data.find(price => 
      price.recurring?.interval === 'month' && 
      price.product.name?.toLowerCase().includes('pro')
    );
    
    const annualPro = prices.data.find(price => 
      price.recurring?.interval === 'year' && 
      price.product.name?.toLowerCase().includes('pro')
    );

    if (monthlyPro) {
      console.log(`✅ Monthly Pro price found: ${monthlyPro.id}`);
    } else {
      console.log('❌ Monthly Pro price not found');
    }

    if (annualPro) {
      console.log(`✅ Annual Pro price found: ${annualPro.id}`);
    } else {
      console.log('❌ Annual Pro price not found');
      console.log('⚠️  Your application will fallback to monthly pricing for annual billing');
    }

    console.log('\n🎉 Stripe pricing verification complete!');

  } catch (error) {
    console.error('❌ Error testing Stripe pricing:', error.message);
    
    if (error.message.includes('Invalid API Key')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Check your STRIPE_SECRET_KEY environment variable');
      console.log('2. Ensure you\'re using the correct key (test vs live)');
      console.log('3. Verify the key format starts with sk_test_ or sk_live_');
    }
  }
}

// Run the test
testStripePricing();
