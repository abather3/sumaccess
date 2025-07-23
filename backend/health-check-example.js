// Example health check endpoint for your Node.js backend
// Add this to your main server file (e.g., app.js, server.js, or index.js)

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const result = await client.query('SELECT 1');
    
    // Return health status
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // Return unhealthy status if database check fails
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Alternative simpler health check (if database check is not needed)
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'healthy',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });
