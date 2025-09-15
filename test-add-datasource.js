/**
 * Simple test script to add a new data source and verify USP updates
 */

async function testAddDataSource() {
  const newDataSource = {
    name: "Test Event API",
    type: "api",
    status: "active",
    description: "A test API for demonstration purposes",
    endpoint: "https://api.test-events.com/v1/",
    coverage: ["Prague", "Brno", "Global"]
  };

  try {
    console.log("Adding new data source:", newDataSource);
    
    const response = await fetch('http://localhost:3000/api/usp-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newDataSource),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Data source added successfully:", result);
      
      // Now fetch the updated USP data
      const uspResponse = await fetch('http://localhost:3000/api/usp-data');
      if (uspResponse.ok) {
        const uspData = await uspResponse.json();
        console.log("📊 Updated USP data:");
        console.log(`  - Total data sources: ${uspData.totalDataSources}`);
        console.log(`  - Active APIs: ${uspData.activeAPIs}`);
        console.log(`  - Total events: ${uspData.totalEvents}`);
        console.log(`  - Cities covered: ${uspData.coverage.cities}`);
        console.log(`  - Data sources:`, uspData.dataSources.map(ds => `${ds.name} (${ds.status})`));
      }
    } else {
      const error = await response.json();
      console.error("❌ Failed to add data source:", error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the test
testAddDataSource();
