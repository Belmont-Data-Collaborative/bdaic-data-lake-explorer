# Data Lake Explorer - User Guide

Welcome to Data Lake Explorer! This guide will help you navigate, search, and analyze datasets in your organization's data lake using our AI-powered tools.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication & Access](#authentication--access)
- [Browsing Datasets](#browsing-datasets)
- [AI-Powered Column Search](#ai-powered-column-search)
- [Dataset Operations](#dataset-operations)
- [AI Features](#ai-features)
- [Downloads & Sampling](#downloads--sampling)
- [Troubleshooting](#troubleshooting)

## Getting Started

### What You Can Do

- **Browse & Explore**: Navigate datasets organized by folders and data sources
- **Smart Search**: Use AI-powered search to find relevant columns and datasets
- **Download Data**: Get optimized samples (1% of data) or full datasets
- **AI Analysis**: Ask questions about your data and generate insights
- **Collaborate**: Share findings and work with multiple datasets simultaneously

### Quick Start Steps

1. **Log In**: Use your provided username and password
2. **Browse Folders**: Explore available data sources in folder cards
3. **Search Datasets**: Use the search bar or AI-powered search
4. **Preview Data**: Use column schema and sample downloads
5. **Analyze**: Leverage AI features for insights and questions

## Authentication & Access

### Logging In

1. Navigate to the Data Lake Explorer URL provided by your administrator
2. Enter your **username** and **password**
3. Click **"Sign In"** to access the application

> **Note**: User registration is disabled. New accounts must be created by administrators.

### Understanding Your Access

Your access level determines what you can see and do:

- **Folder Access**: You can only see folders assigned to you by administrators
- **AI Features**: AI capabilities (Ask AI, Generate Insights) may be enabled or disabled for your account
- **Download Permissions**: All users can download samples and full datasets from accessible folders

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

**Common Folder Types:**
- `cdc_places` - CDC health and demographic data
- `census_acs5` - American Community Survey data
- `feeding_america` - Food insecurity statistics
- `irs_990_efile` - Nonprofit organization data

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

Our advanced AI search helps you find relevant data columns using natural language, even when column names don't exactly match your search terms.

### How It Works

1. **Type Your Search**: Enter 3+ characters describing what you're looking for
2. **Instant Results**: See exact matches immediately
3. **AI Processing**: Watch for "AI is searching for semantic matches..." indicator
4. **Enhanced Results**: AI finds related columns (e.g., "location" finds "State", "District")

### Search Examples

| Search Term | Finds Columns Like | Why It Matches |
|-------------|-------------------|----------------|
| "location" | State, District, County, Address | Geographic identifiers |
| "income" | Salary, Wages, Earnings, Revenue | Financial data |
| "health" | BMI, Blood_Pressure, Diagnosis | Medical indicators |
| "population" | Residents, People_Count, Demographics | Population metrics |
| "education" | School, Degree, GPA, Enrollment | Educational data |

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

**Available Actions:**
- **Download Sample**: Get 1% sample (optimized for quick preview)
- **Download Full Dataset**: Get complete dataset file
- **Download Metadata**: Get YAML file with column information
- **Ask AI**: Generate insights about the dataset (if enabled)
- **Generate Insights**: Create AI-powered analysis (if enabled)

## AI Features

> **Note**: AI features must be enabled for your account by an administrator.

### Ask AI

**Single Dataset Analysis:**
1. Open a dataset and click **"Ask AI"**
2. Type your question about the data
3. Receive AI-generated insights and analysis

**Multi-Dataset Analysis:**
1. Select multiple datasets using checkboxes
2. Click **"Ask AI"** in the selection panel
3. Ask comparative questions across datasets

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

**Chat Features:**
- **Markdown Support**: Formatted responses with lists, tables, and emphasis
- **Conversation History**: Previous questions and answers maintained
- **Context Awareness**: AI remembers your previous questions
- **Copy Responses**: Copy AI responses for documentation

**Best Practices:**
- Ask specific questions about data patterns
- Request explanations of unusual values or distributions
- Inquire about potential data quality issues
- Seek suggestions for analysis approaches

### Privacy & Security

**Data Handling:**
- Sample data is sent to OpenAI for processing
- Questions and responses are processed according to OpenAI's data policies
- No full datasets are transmitted to external services
- Your administrator controls AI feature availability

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