#!/usr/bin/env ts-node
// Test script to demonstrate subcategory selection functionality

import { SUBCATEGORY_TAXONOMY, getAllSubcategoriesForCategory, calculateSubcategoryOverlap } from '../src/lib/constants/subcategory-taxonomy';

console.log('🎯 Subcategory Selection Demo\n');

// Demo 1: Show available subcategories for each category
console.log('📋 Available Subcategories by Category:');
console.log('=' .repeat(50));

Object.entries(SUBCATEGORY_TAXONOMY).forEach(([category, config]) => {
  const subcategories = Object.keys(config.subcategories);
  console.log(`\n${category}:`);
  subcategories.forEach(subcategory => {
    console.log(`  • ${subcategory}`);
  });
});

// Demo 2: Show how subcategory selection affects audience overlap
console.log('\n\n🎵 Audience Overlap Examples:');
console.log('=' .repeat(50));

const examples = [
  { category: 'Entertainment', subcategory1: 'Rock', subcategory2: 'Metal' },
  { category: 'Entertainment', subcategory1: 'Rock', subcategory2: 'Jazz' },
  { category: 'Entertainment', subcategory1: 'Pop', subcategory2: 'Electronic' },
  { category: 'Technology', subcategory1: 'AI/ML', subcategory2: 'Data Science' },
  { category: 'Technology', subcategory1: 'AI/ML', subcategory2: 'Web Development' },
  { category: 'Business', subcategory1: 'Marketing', subcategory2: 'Sales' },
  { category: 'Business', subcategory1: 'Marketing', subcategory2: 'Finance' }
];

examples.forEach(example => {
  const overlap = calculateSubcategoryOverlap(
    example.category,
    example.subcategory1,
    example.category,
    example.subcategory2
  );
  
  const overlapPercentage = Math.round(overlap * 100);
  console.log(`\n${example.subcategory1} vs ${example.subcategory2}: ${overlapPercentage}% overlap`);
  
  if (overlapPercentage > 70) {
    console.log(`  🎯 High overlap - very similar audiences`);
  } else if (overlapPercentage > 40) {
    console.log(`  ⚖️  Moderate overlap - some audience sharing`);
  } else if (overlapPercentage > 10) {
    console.log(`  🔀 Low overlap - different audiences`);
  } else {
    console.log(`  🚫 Minimal overlap - very different audiences`);
  }
});

// Demo 3: Show how the form would work
console.log('\n\n📝 Form Selection Flow:');
console.log('=' .repeat(50));

const userSelections = [
  { category: 'Entertainment', subcategory: 'Rock' },
  { category: 'Technology', subcategory: 'AI/ML' },
  { category: 'Business', subcategory: 'Marketing' }
];

userSelections.forEach(selection => {
  console.log(`\nUser selects: ${selection.category} → ${selection.subcategory}`);
  
  const availableSubcategories = getAllSubcategoriesForCategory(selection.category);
  console.log(`Available subcategories: ${availableSubcategories.join(', ')}`);
  
  // Show what would happen with different competing events
  const competingEvents = [
    { category: 'Entertainment', subcategory: 'Metal' },
    { category: 'Entertainment', subcategory: 'Jazz' },
    { category: 'Technology', subcategory: 'Web Development' }
  ];
  
  competingEvents.forEach(competing => {
    if (competing.category === selection.category) {
      const overlap = calculateSubcategoryOverlap(
        selection.category,
        selection.subcategory,
        competing.category,
        competing.subcategory
      );
      const overlapPercentage = Math.round(overlap * 100);
      console.log(`  vs ${competing.subcategory}: ${overlapPercentage}% audience overlap`);
    }
  });
});

console.log('\n\n✅ Subcategory selection is now fully integrated!');
console.log('Users can now select their event subcategory for more accurate audience overlap analysis.');
