# Sportradar Integration Setup

This document explains how to set up Sportradar API integration for ATP rankings and tournament data.

## 🎯 Overview

Sportradar provides official ATP data through their API, offering:
- Real-time ATP rankings
- Tournament schedules and results
- Player profiles and statistics
- Historical match data

## 🔑 Getting Started

### 1. Create Sportradar Account

1. Visit [Sportradar Developer Portal](https://developer.sportradar.com/)
2. Create an account
3. Navigate to "My Account" section
4. Generate an API key for Tennis data

### 2. Configure API Key

Add your Sportradar API key to your Supabase environment variables:

```bash
# In your Supabase project settings > Edge Functions > Environment Variables
SPORTRADAR_API_KEY=your_api_key_here
```

### 3. API Access Levels

Sportradar offers different access levels:

- **Trial**: Free tier with limited requests
- **Production**: Paid tier with higher limits

The current implementation uses the trial tier by default.

## 📊 Available Endpoints

### Rankings
- **ATP Rankings**: `https://api.sportradar.com/tennis/trial/v3/en/rankings.json`
- **WTA Rankings**: `https://api.sportradar.com/tennis/trial/v3/en/rankings.json`

### Tournaments
- **Tournament List**: `https://api.sportradar.com/tennis/trial/v3/en/tournaments.json`
- **Tournament Schedule**: `https://api.sportradar.com/tennis/trial/v3/en/tournaments/{id}/schedule.json`

### Players
- **Player Profile**: `https://api.sportradar.com/tennis/trial/v3/en/players/{id}/profile.json`

## 🔄 Data Flow

### Rankings Update
1. **Primary**: Sportradar API (most reliable)
2. **Fallback**: ATP Official API
3. **Final Fallback**: Web scraping
4. **Last Resort**: Static data

### Tournament Update
1. **Primary**: Sportradar API
2. **Fallback**: ATP Official API
3. **Final Fallback**: Static data

## 🛠️ Implementation Details

### Files Modified
- `supabase/functions/fetch-rankings/index.ts` - Updated to use Sportradar
- `supabase/functions/fetch-rankings/sportradar-service.ts` - New service class
- `supabase/functions/fetch-tournaments-sportradar/index.ts` - New tournament function
- `src/components/CompetitionManagement.tsx` - Added Sportradar buttons

### Service Class
The `SportradarService` class provides:
- Centralized API configuration
- Error handling and retries
- Data mapping and normalization
- Support for multiple data types

## 🚀 Usage

### Admin Interface
1. Go to **Admin > Competition Management**
2. Use **"Update from Sportradar"** buttons:
   - **Players**: Updates ATP rankings
   - **Tournaments**: Updates tournament data

### API Calls
```typescript
// Get ATP rankings
const sportradar = createSportradarService();
const rankings = await sportradar.getATPRankings();

// Get tournaments
const tournaments = await sportradar.getTournaments();
```

## 📈 Rate Limits

### Trial Tier
- **Requests per day**: Limited (check your account)
- **Requests per minute**: Limited
- **Data freshness**: May have delays

### Production Tier
- **Higher limits**: Contact Sportradar for details
- **Real-time data**: Faster updates
- **Priority support**: Included

## 🔧 Configuration

### Environment Variables
```bash
# Required
SPORTRADAR_API_KEY=your_api_key

# Optional (defaults shown)
SPORTRADAR_ACCESS_LEVEL=trial
SPORTRADAR_LANGUAGE=en
```

### Customization
You can modify the service configuration in `sportradar-service.ts`:

```typescript
const sportradar = new SportradarService(
  apiKey,
  'production', // or 'trial'
  'en' // language code
);
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `SPORTRADAR_API_KEY` is set in Supabase
   - Check the key is valid and active

2. **Rate Limit Exceeded**
   - Wait before making more requests
   - Consider upgrading to production tier

3. **Data Not Updating**
   - Check API key permissions
   - Verify network connectivity
   - Check Supabase function logs

### Debug Mode
Enable detailed logging by checking the Supabase function logs:

```bash
# View function logs
supabase functions logs fetch-rankings
supabase functions logs fetch-tournaments-sportradar
```

## 📚 Resources

- [Sportradar Developer Portal](https://developer.sportradar.com/)
- [Tennis API Documentation](https://developer.sportradar.com/docs/tennis)
- [API Reference](https://developer.sportradar.com/reference/tennis)
- [Rate Limits](https://developer.sportradar.com/docs/rate-limits)

## 🔄 Migration from Current System

The Sportradar integration is designed to be backward compatible:

1. **Existing data**: Preserved and updated
2. **Fallback system**: Maintains current functionality
3. **Admin interface**: Enhanced with new options
4. **No breaking changes**: Current features continue to work

## 💡 Best Practices

1. **Monitor usage**: Keep track of API calls
2. **Cache data**: Implement local caching for frequently accessed data
3. **Error handling**: Always have fallback options
4. **Regular updates**: Schedule regular data refreshes
5. **Backup data**: Keep local copies of critical data

## 🆘 Support

For issues with:
- **Sportradar API**: Contact Sportradar support
- **Implementation**: Check the code comments and logs
- **Configuration**: Verify environment variables
