# Data Lake Explorer - User Guide

Welcome to Data Lake Explorer! This comprehensive guide will help you navigate, search, and analyze datasets in your organization's data lake using our AI-powered tools and advanced data exploration features.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Authentication & Access](#authentication--access)
- [Browsing Datasets](#browsing-datasets)
- [AI-Powered Column Search](#ai-powered-column-search)
- [Dataset Operations](#dataset-operations)
- [AI Features](#ai-features)
- [Downloads & Sampling](#downloads--sampling)
- [User Panel & Account](#user-panel--account)
- [Collaboration Features](#collaboration-features)
- [Troubleshooting](#troubleshooting)
- [Tips & Best Practices](#tips--best-practices)

## Getting Started

### What You Can Do

- **Browse & Explore**: Navigate datasets organized by folders and data sources
- **Smart Search**: Use AI-powered semantic search to find relevant columns and datasets
- **Download Data**: Get optimized samples (1% of data with intelligent bounds) or full datasets
- **AI Analysis**: Ask questions about your data and generate AI-powered insights (if enabled)
- **Multi-Dataset Analysis**: Compare and analyze multiple datasets simultaneously (if enabled)
- **Column Discovery**: Find relevant data columns using natural language descriptions
- **Real-Time Statistics**: View dynamic statistics about your accessible data
- **Usage Tracking**: Monitor your data access and download patterns

### Quick Start Steps

1. **Log In**: Use your provided username and password
2. **Browse Folders**: Explore available data sources in folder cards (based on your permissions)
3. **Search Datasets**: Use the search bar or AI-powered search (if enabled for your account)
4. **Preview Data**: Use column schema and sample downloads
5. **Analyze**: Leverage AI features for insights and questions (if enabled for your account)

## Authentication & Access

### Logging In

1. Navigate to the Data Lake Explorer URL provided by your administrator
2. Enter your **username** and **password**
3. Click **"Sign In"** to access the application

> **Note**: User registration is disabled. New accounts must be created by administrators.

### Understanding Your Access

Your access level determines what you can see and do:

**Role-Based Access:**
- **User Role**: Access to assigned folders with data exploration and download capabilities
- **Admin Role**: Full system access including user management and system configuration

**Granular Permissions:**
- **Folder Access**: You can only see folders explicitly assigned to you by administrators
- **AI Features**: AI capabilities (Ask AI, Generate Insights, Multi-Dataset Chat) can be enabled/disabled per user
- **Download Permissions**: Sample downloads (1% samples), full dataset downloads, and metadata downloads
- **Search Capabilities**: Both exact column matching and AI-powered semantic search

**Account Controls:**
- **Active Status**: Inactive accounts cannot access the system
- **Session Management**: JWT-based secure sessions with automatic expiration
- **Usage Tracking**: Your download and AI usage activities are monitored

### Account Status

If you see authentication errors:
- Your account may be inactive (contact your administrator)
- Your session may have expired (try logging in again)
- You may lack permissions for specific folders

## Browsing Datasets

### Folder Organization

Datasets are organized into folders by data source:

**Folder Card Information:**
- **Dataset Count**: Number of datasets in the folder
- **Total Size**: Combined size of all datasets
- **Data Sources**: How many different sources contribute data
- **Last Updated**: When the folder was last refreshed

**Common Data Source Types:**
- `cdc_places` - CDC health and demographic data
- `census_acs5` - American Community Survey data  
- `census_acs5_profile` - Census profile data
- `irs_990_efile` - Nonprofit organization data
- `usda_census_agriculture` - Agricultural census data
- `ndacan` - Child welfare and abuse data
- `nashville_police_incidents` - Police incident reports
- `nashville_traffic_accidents` - Traffic accident data
- `cms_medicare_disparities` - Medicare disparity data
- `cdc_svi` - Social vulnerability index
- `epa_ejscreen` - Environmental justice data
- `cdc_wonder` - CDC health statistics
- `feeding_america` - Food insecurity statistics
- `county_health_rankings` - Health ranking data
- `state_specific` - State-level data
- `epa_smart_location` - Location-based data
- `usda_food_access` - Food access metrics

**Note**: You will only see folders and datasets that your administrator has granted you access to.

### Dataset Information

Each dataset displays:

- **Name**: Descriptive dataset identifier
- **Format**: File type (CSV, JSON, Parquet, Avro)
- **Size**: File size with human-readable format
- **Records**: Estimated number of data rows
- **Columns**: Number of data columns
- **Last Modified**: When the dataset was last updated
- **Download Statistics**: Usage metrics (samples, full downloads)

### Navigation Tips

- **Folder Filters**: Click folder names to filter datasets
- **Search Bar**: Search across all accessible datasets
- **Sort Options**: Datasets are organized by relevance and recency
- **Pagination**: Large folder contents are paginated for performance

## AI-Powered Column Search

### Overview

Our advanced AI-powered semantic search uses OpenAI GPT-4o to help you find relevant data columns using natural language, even when column names don't exactly match your search terms. This revolutionary feature understands the meaning behind your search and finds conceptually related columns across all your accessible datasets.

### How It Works

1. **Type Your Search**: Enter 3+ characters describing what you're looking for
2. **Instant Results**: See exact column name and description matches immediately
3. **AI Processing**: Watch for "AI is searching for semantic matches..." loading indicator
4. **Enhanced Results**: AI finds semantically related columns (e.g., "location" finds "State", "District", "County")
5. **Smart Filtering**: Results are filtered to only show data from folders you can access

### Technical Implementation

**Search Process:**
- **Immediate Matching**: Local search through column names and descriptions
- **AI Enhancement**: OpenAI GPT-4o analyzes search intent and finds semantic matches
- **Context Awareness**: AI considers data context and domain-specific terminology
- **Performance Optimized**: 2-3 second response time with intelligent caching

### Real Search Examples

| Search Term | Exact Matches | AI-Discovered Matches | Why AI Found Them |
|-------------|---------------|---------------------|-------------------|
| "location" | Location_Name | State, District, County, ZIP, Address, Region | Geographic identifiers and spatial data |
| "income" | Median_Income | Earnings, Wages, Salary, Revenue, Economic_Status | Financial and economic indicators |
| "health" | Health_Index | BMI, Mortality, Disease_Rate, Medical_Costs | Health outcomes and medical metrics |
| "population" | Population | People_Count, Residents, Demographics, Households | Population and demographic data |
| "education" | Education_Level | School_Count, Enrollment, Graduation_Rate, Degrees | Educational attainment and infrastructure |
| "food security" | (none) | Food_Access, Grocery_Stores, SNAP_Benefits | Food access and assistance programs |
| "race" | Race | Ethnicity, Demographics, Minority_Population | Demographic and diversity data |
| "housing" | Housing_Units | Home_Value, Rent, Occupancy, Vacancy_Rate | Housing market and availability |

**Real-World Success Stories:**
- Searching "food insecurity" finds columns like "SNAP_Recipients", "Food_Desert_Flag", "Grocery_Access"
- Searching "economic hardship" discovers "Poverty_Rate", "Unemployment", "Income_Inequality"
- Searching "environmental justice" locates "Air_Quality", "Pollution_Burden", "Environmental_Health"

### Search Interface

**Visual Indicators:**
- 🔍 **Search Box**: Type your query here
- ⏳ **Loading Spinner**: AI is processing your search
- 💡 **Results Counter**: Shows number of matches found
- ℹ️ **Hints**: "Including AI-suggested matches" when AI finds additional results

**Search States:**
1. **Immediate**: Exact name/description matches appear instantly
2. **Processing**: "AI is searching for semantic matches..." with spinner
3. **Complete**: All results displayed with AI suggestions noted

### Best Practices

- **Use Descriptive Terms**: "customer data" works better than "customers"
- **Try Different Angles**: If "address" doesn't work, try "location" or "geographic"
- **Wait for AI**: Give AI search 2-3 seconds to find semantic matches
- **Browse Results**: AI might find relevant columns you didn't expect

## Dataset Operations

### Viewing Dataset Details

Click on any dataset to expand its details:

**Dataset Header:**
- Basic information (name, size, format)
- Download statistics and usage metrics
- Action buttons (downloads, AI features)

**Column Schema Section:**
- Complete list of all data columns
- Column types (string, integer, float, date)
- Sample values for each column
- Column descriptions when available

**Metadata Section:**
- Data source and collection information
- File format and technical details
- Date accessed and modification history

### Column Schema Navigation

**Search Columns:**
- Use the search box to find specific columns
- AI search works within individual datasets
- Filter by column type or characteristics

**Column Display:**
- **Name**: Column identifier
- **Type**: Data type (string, integer, etc.)
- **Description**: Column purpose or content description
- **Sample Values**: Example data from the column

**Pagination:**
- View 8 columns per page by default
- Adjust to show 16, 32, or all columns
- Navigate with previous/next buttons

### Dataset Actions

**Core Actions Available to All Users:**
- **Download Sample**: Get 1% intelligent sample (1KB-10MB bounds, optimized for preview)
- **Download Full Dataset**: Get complete dataset file (all formats supported)
- **Download Metadata**: Get YAML file with complete column schema and technical details
- **View Column Schema**: Browse all columns with types, descriptions, and sample values
- **Search Within Dataset**: Use AI search to find specific columns in the dataset

**AI-Powered Actions** (when enabled for your account):
- **Ask AI**: Ask natural language questions about the dataset
- **Generate Insights**: Create AI-powered analysis of data patterns and characteristics
- **Multi-Dataset Chat**: Compare and analyze multiple datasets simultaneously

**Advanced Features:**
- **Usage Statistics**: View download counts and access patterns
- **Column Pagination**: Navigate through large schemas efficiently
- **Format Information**: See technical details about file formats and structure
- **Last Modified Tracking**: Understand data freshness and update patterns

## AI Features

> **Note**: AI features must be enabled for your account by an administrator.

### Ask AI

**Single Dataset Analysis:**
1. Expand any dataset card to view details
2. Click **"Ask AI"** button in the dataset actions
3. Type your question about the data structure, patterns, or content
4. Receive AI-generated insights powered by OpenAI GPT-4o
5. Continue the conversation with follow-up questions

**Multi-Dataset Chat:**
1. Select multiple datasets using checkboxes (select up to 10 datasets)
2. Click **"Multi-Dataset Chat"** button in the floating action panel
3. Ask comparative questions across datasets
4. Analyze relationships and patterns between different data sources
5. Generate cross-dataset insights and recommendations

**Sample Questions to Ask:**
- "What are the main patterns in this demographic data?"
- "How does this health data compare across different geographic regions?"
- "What are potential data quality issues I should be aware of?"
- "How could I combine this dataset with census data for analysis?"
- "What columns would be most useful for predicting health outcomes?"

### Generate Insights

**Automatic Analysis:**
- Click **"Generate Insights"** on any dataset
- AI analyzes the data structure and content
- Provides summary, patterns, and potential use cases

**Insight Types:**
- **Summary**: Overview of dataset contents and quality
- **Patterns**: Trends and relationships in the data
- **Use Cases**: Suggested analytical applications

### AI Chat Interface

**Advanced Chat Features:**
- **Markdown Support**: Formatted responses with lists, tables, code blocks, and emphasis
- **Conversation History**: Full conversation context maintained throughout session
- **Context Awareness**: AI remembers your previous questions and builds on them
- **Copy Responses**: Copy AI responses for documentation and sharing
- **Scroll Navigation**: Smooth scrolling with improved chat window management
- **Loading Indicators**: Clear feedback during AI processing
- **Error Handling**: Graceful handling of API limits and connectivity issues

**Conversation Management:**
- **Session Persistence**: Conversations maintained during your login session
- **Multi-Turn Dialogue**: Ask follow-up questions and build on previous responses
- **Context Switching**: Switch between single and multi-dataset conversations
- **Response Quality**: Powered by OpenAI GPT-4o for high-quality, relevant insights

**Best Practices:**
- Ask specific questions about data patterns
- Request explanations of unusual values or distributions
- Inquire about potential data quality issues
- Seek suggestions for analysis approaches

### Privacy & Security

**AI Data Processing:**
- **Sample Data Only**: Only dataset samples (1% of data, max 10MB) are sent to OpenAI
- **No Full Datasets**: Complete datasets never leave your organization's infrastructure
- **Column Schema Information**: Metadata and column descriptions may be shared for context
- **OpenAI Policies**: All AI processing follows OpenAI's data usage and retention policies
- **Administrator Control**: Your admin controls AI feature availability per user

**Security Measures:**
- **Folder-Based Access**: AI only processes data from folders you have permission to access
- **User-Level Controls**: AI features can be disabled for individual users
- **Audit Logging**: All AI usage is tracked for compliance and monitoring
- **Session Security**: AI conversations are tied to your secure authenticated session

## Downloads & Sampling

### Sample Downloads

**Optimized Sampling:**
- **Sample Size**: 1% of original file size (improved from 10%)
- **Smart Bounds**: Minimum 1KB, maximum 10MB for optimal performance
- **Format Preservation**: Maintains original file structure and format
- **Quick Preview**: Fast download for data exploration

**When to Use:**
- First-time data exploration
- Understanding data structure
- Quick analysis and testing
- Sharing small data samples

### Full Dataset Downloads

**Complete Data Access:**
- Downloads the entire dataset file
- Preserves all data quality and completeness
- Suitable for comprehensive analysis
- May take longer for large datasets

**Download Process:**
1. Click **"Download Full Dataset"**
2. File processing begins on server
3. Download starts automatically when ready
4. Check download statistics for confirmation

### Metadata Downloads

**YAML Format:**
- Complete column schema information
- Data types and descriptions
- File metadata and statistics
- Technical specifications

**Use Cases:**
- Documentation and data cataloging
- Schema analysis and planning
- Integration with other tools
- Data governance requirements

### Download Troubleshooting

**Common Issues:**
- **Slow Downloads**: Large files may take time; check network connection
- **Failed Downloads**: Verify file exists and you have permissions
- **Incomplete Downloads**: Retry download or try sample first

**Performance Tips:**
- Use sample downloads for initial exploration
- Download full datasets only when needed
- Check file size before downloading large datasets
- Use stable internet connection for large downloads

## Troubleshooting

### Common Issues

#### Search Problems

**AI Search Not Working:**
- Ensure your account has AI features enabled
- Verify search term is 3+ characters long
- Wait 2-3 seconds for AI processing
- Check browser console for errors

**No Search Results:**
- Try different search terms or synonyms
- Verify you're searching in the correct folder
- Check column descriptions, not just names
- Contact administrator about data access

#### Access Issues

**Cannot See Datasets:**
- Verify you're in the correct folder
- Check with administrator about folder permissions
- Ensure your account is active
- Try refreshing the page

**Authentication Problems:**
- Check username and password accuracy
- Verify account is not inactive
- Clear browser cache and cookies
- Contact administrator for account status

#### Performance Issues

**Slow Loading:**
- Check internet connection stability
- Large datasets may take time to process
- Try refreshing the page
- Check server status with administrator

**Download Problems:**
- Start with sample downloads for testing
- Verify sufficient disk space
- Check browser download settings
- Try different browser if issues persist

### Getting Help

**Self-Service:**
1. Check this user guide for common solutions
2. Review error messages in browser console
3. Try basic troubleshooting steps (refresh, re-login)
4. Test with different datasets or folders

**Administrator Support:**
Contact your Data Lake Explorer administrator for:
- **Access Issues**: Folder permissions, account activation
- **AI Features**: Enabling AI capabilities for your account
- **Technical Problems**: Server issues, data access problems
- **Training**: Additional guidance on using the platform

**Information to Provide:**
- Your username (never share passwords)
- Specific error messages
- Steps you took before the issue occurred
- Browser and operating system information

### Best Practices

**Efficient Data Exploration:**
1. Start with folder browsing to understand available data
2. Use AI column search to find relevant datasets quickly
3. Download samples first to understand data structure
4. Use AI features to gain insights before full analysis
5. Document your findings for future reference

**Collaboration Tips:**
- Share specific dataset names and folders with colleagues
- Use AI insights to communicate data findings
- Document useful column search terms for your team
- Report data quality issues to administrators

---

**Need More Help?**  
Contact your organization's Data Lake Explorer administrator for additional support, training, or access to advanced features.

**Last Updated**: September 2025  
**Version**: 2.1.0 (AI Search Enhancement Release)