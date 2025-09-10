# User Guide for Data Lake Explorer

## Overview

Welcome to Data Lake Explorer! This guide will help you understand all the features and capabilities available to you as a user. Data Lake Explorer is designed to help you efficiently explore, analyze, and extract insights from large datasets in your organization's data lake.

## Getting Started

### Logging In
1. Navigate to the Data Lake Explorer application
2. Enter your username and password provided by your administrator
3. Click "Sign In" to access the platform

### Your Dashboard
After logging in, you'll see the main dashboard with:
- **Folder Overview**: Visual cards showing all data folders you have access to
- **Search and Filter Bar**: Tools to find specific datasets
- **Navigation Tabs**: Switch between different views (All Datasets, Folders, etc.)

## Understanding Your Access

### Folder-Based Permissions
Your access to datasets is managed through folders. Each folder represents a different category or source of data:

- **Folder Access**: You can only see and interact with datasets in folders you've been granted access to
- **Folder Cards**: Each folder shows:
  - Number of datasets
  - Total size of data
  - File format distribution (CSV, JSON, Parquet, etc.)
- **Access Levels**: Your administrator controls which folders you can access

### User Profile
To view your current permissions and settings:
1. Navigate to your user profile 
2. Check your:
   - Username and email
   - Role (will show "user")
   - AI features status (enabled/disabled)

## Browsing and Exploring Datasets

### Folder Navigation
1. **Browse by Folder**: Click on any folder card to see datasets within that folder
2. **Folder Information**: Each folder card displays:
   - Folder name (formatted for readability)
   - Dataset count
   - Total storage size
   - File format breakdown

### Dataset Views
You can view datasets in two ways:
- **Card View**: Visual cards with key information
- **List View**: Detailed table format with more metadata

### Dataset Information
Each dataset displays:
- **Name**: Dataset identifier and title
- **Source**: Where the data originated
- **Format**: File type (CSV, JSON, Parquet, Avro, etc.)
- **Size**: File size in readable format
- **Last Modified**: When the dataset was last updated
- **Metadata**: Detailed information about columns, data types, and structure

## Search and Filtering

### Basic Search
1. **Search Bar**: Type keywords to find datasets by:
   - Dataset name
   - Source information
   - Description content
   - Metadata tags

2. **Filter Options**:
   - **Format Filter**: Filter by file type (CSV, JSON, Parquet, Avro, All)
   - **Tag Filter**: Filter by metadata tags when available
   - **Folder Filter**: Focus on specific folders

### AI-Powered Dataset Discovery
If AI features are enabled for your account:

1. **Find Dataset Button**: Click the "Find Dataset" button
2. **Natural Language Search**: Describe what you're looking for in plain English
   - Example: "customer demographics data from 2023"
   - Example: "health outcomes by county"
   - Example: "census data with income information"

3. **AI Results**: The system will:
   - Analyze your query
   - Search through available datasets
   - Rank results by relevance and may include brief descriptions

## AI-Powered Features

*Note: AI features must be enabled by your administrator and for your specific account*

### Ask AI Feature
The Ask AI feature allows you to have conversations with your data:

#### Single Dataset Analysis
1. **Select a Dataset**: Click on any dataset card
2. **Ask AI Button**: Click the "Ask AI" button if available
3. **Ask Questions**: Type questions about the data in natural language

**Example Questions**:
- "What does this dataset contain?"
- "What are the main patterns in this data?"
- "Which variables show the most variation?"
- "Are there any trends over time?"
- "What insights can you provide about this data?"

#### Multi-Dataset Chat
1. **Selection Mode**: Enable multi-select mode
2. **Select Multiple Datasets**: Choose 2 or more datasets
3. **Ask AI**: Use the "Ask AI" button to analyze multiple datasets together

**Multi-Dataset Analysis Capabilities**:
- Compare metrics across different datasets
- Identify common patterns and themes
- Merge insights from related data sources
- Provide comprehensive multi-source analysis

#### How Ask AI Works
The AI feature uses advanced context engineering:

1. **Context Preparation**: 
   - Analyzes dataset structure and metadata
   - Extracts representative samples from large datasets
   - Generates statistical summaries
   - Creates comprehensive data understanding

2. **Intelligent Sampling**:
   - Selects representative rows for large datasets
   - Focuses on most informative columns
   - Ensures context fits within AI model limits
   - Filters out incomplete or corrupted data

3. **Question Processing**:
   - Understands natural language queries
   - Provides relevant, contextual answers
   - Offers follow-up suggestions
   - Maintains conversation flow

#### Best Practices for AI Interactions

**Crafting Effective Questions**:
- **Be Specific**: "What are the top 5 states by population?" vs "Tell me about states"
- **Provide Context**: "I'm looking for health disparities data to analyze rural access"
- **Ask Follow-ups**: Build on previous responses to go deeper

**Question Strategies**:
- Start broad, then narrow down
- Ask about patterns and trends
- Request specific statistics
- Inquire about relationships between variables
- Ask for practical applications

**Example Interaction Flows**:

*Initial Exploration*:
- User: "What does this Census dataset contain?"
- AI: [Provides overview of demographics, geography, key variables]
- User: "Which variables show the most variation across counties?"

*Hypothesis Testing*:
- User: "I think urban areas have better health outcomes. What does this data show?"
- AI: [Analyzes urban vs rural health indicators]
- User: "What factors might explain these differences?"

### AI Limitations
The AI feature:
- **Can**: Analyze patterns, provide insights, explain data, generate hypotheses
- **Cannot**: Access external data, make causal claims, provide personal information, guarantee 100% accuracy

## Download Options

For each dataset, you have three download options:

### 1. Sample Download
- **Purpose**: Quick preview of the data structure
- **Content**: Representative subset of rows
- **Use Case**: Understanding data format before full download
- **File Size**: Smaller, faster download

### 2. Full Download
- **Purpose**: Complete dataset access
- **Content**: All rows and columns
- **Use Case**: Complete analysis and processing
- **File Size**: Full dataset size

### 3. Metadata Download
- **Purpose**: Dataset documentation and schema
- **Content**: YAML file with:
  - Column names and types
  - Data statistics
  - Source information
  - Tags and descriptions
- **Use Case**: Understanding data without downloading actual data

### Download Process
1. **Select Dataset**: Click on the dataset you want
2. **Choose Download Type**: Click the appropriate download button
3. **File Delivery**: File will download directly to your device
4. **Usage Tracking**: Downloads may be logged for administrative purposes

## User Profile Management

### Viewing Your Profile
Access your profile to see:
- **Account Information**: Username, email, role
- **AI Status**: Whether AI features are enabled
- **Permissions**: Current folder access (managed by admin)

### Settings You Can Control
As a standard user, you can:
- **View Your Information**: Check your current settings
- **Contact Administrator**: Request changes to permissions or settings

*Note: Most settings changes (role, permissions, AI access) must be made by administrators*

## Accessibility Features

Data Lake Explorer is designed with accessibility best practices:

### Keyboard Navigation
- **Tab Navigation**: Navigate through all interactive elements
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate through lists and menus
- **Escape**: Close dialogs and menus

### Screen Reader Support
- **ARIA Labels**: Key interactive elements include descriptive labels
- **Semantic HTML**: Proper heading structure and landmarks
- **Live Regions**: Dynamic content updates are announced
- **Focus Management**: Clear focus indicators throughout the interface

### Visual Accessibility
- **High Contrast**: Clear color contrast for text and backgrounds
- **Responsive Design**: Works on all screen sizes and zoom levels
- **Loading States**: Clear indicators when content is loading
- **Error Messages**: Descriptive error messages and recovery suggestions

## Data Privacy and Security

### Your Data Safety
- **Permissions Respected**: You can only access authorized folders
- **Usage Monitoring**: Download activity may be monitored by administrators
- **Secure Authentication**: Login sessions are protected
- **AI Data Handling**: When using AI features, your questions and representative data samples are sent to OpenAI for processing. Data is not permanently stored by the AI system, but processing follows OpenAI's data handling policies

### Best Practices
- **Log Out**: Always log out when finished
- **Secure Downloads**: Only download data you're authorized to access
- **Report Issues**: Contact administrators if you see unexpected data access
- **Review AI Responses**: Validate AI insights with your domain knowledge

## Getting Help

### Common Issues and Solutions

**Can't See Expected Datasets**:
- Check if you're in the correct folder
- Verify your folder permissions with your administrator
- Try refreshing the page

**AI Features Not Available**:
- Confirm AI is enabled for your account
- Check if AI is enabled for the specific folder
- Contact your administrator to enable AI features

**Download Problems**:
- Check your internet connection
- Verify you have permission to access the dataset
- Try a smaller sample download first

**Search Not Finding Results**:
- Try different keywords
- Check spelling and formatting
- Use the AI-powered dataset discovery feature
- Browse by folder instead

### Getting Additional Support
- **Administrator Contact**: Reach out to your organization's Data Lake Explorer administrator
- **Technical Issues**: Report bugs or technical problems to your IT support team
- **Training**: Ask your administrator about additional training resources

## Advanced Tips

### Efficient Dataset Discovery
1. **Use Folder Browsing**: Start with relevant folders to narrow your search
2. **Leverage AI Search**: Describe your data needs in natural language
3. **Check Metadata First**: Download metadata to understand structure before full downloads
4. **Bookmark Useful Searches**: Keep track of search terms that work well

### Maximizing AI Interactions
1. **Provide Context**: Explain your analysis goals and domain
2. **Ask Follow-up Questions**: Build on AI responses to go deeper
3. **Request Specific Formats**: Ask for tables, summaries, or bullet points
4. **Combine Datasets**: Use multi-dataset chat for comprehensive analysis

### Data Analysis Workflow
1. **Discover**: Use search and AI discovery to find relevant datasets
2. **Preview**: Download metadata and samples to understand structure
3. **Analyze**: Use AI features to gain initial insights
4. **Download**: Get full datasets for detailed analysis
5. **Validate**: Cross-reference AI insights with domain knowledge

## Conclusion

Data Lake Explorer provides powerful tools for exploring and analyzing your organization's data. With folder-based access control, AI-powered insights, and comprehensive search capabilities, you can efficiently discover and work with the datasets you need.

Remember that your access and capabilities are managed by your administrator. If you need additional permissions, AI features enabled, or access to new folders, contact your organization's Data Lake Explorer administrator.

For technical support or questions about this guide, reach out to your IT support team or Data Lake Explorer administrator.