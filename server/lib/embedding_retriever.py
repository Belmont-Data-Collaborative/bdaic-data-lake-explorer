#!/usr/bin/env python3
"""
Enhanced Context Retrieval using Embeddings for Data Lake Explorer
This script uses scikit-learn for lightweight embeddings and similarity search
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from dataclasses import dataclass
import pickle


@dataclass
class Document:
    """Simple document class to hold content and metadata"""
    page_content: str
    metadata: Dict[str, Any]


class EmbeddingRetriever:
    """
    A class to handle CSV data embedding and retrieval using TF-IDF and cosine similarity
    """
    
    def __init__(self, max_features: int = 5000):
        """
        Initialize the retriever with TF-IDF vectorizer
        
        Args:
            max_features: Maximum number of features for TF-IDF
        """
        print(f"Initializing TF-IDF vectorizer with max_features: {max_features}")
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            stop_words='english',
            ngram_range=(1, 3),  # Include 3-grams for better phrase matching
            min_df=1,
            max_df=0.95,
            token_pattern=r'\b[A-Za-z]{2,}\b',  # Better tokenization
            analyzer='word',
            lowercase=True,
            sublinear_tf=True  # Sublinear term frequency scaling
        )
        self.embeddings = None
        self.documents = []
        
    def load_csv(self, file_path: str, sample_size: Optional[int] = None) -> List[Document]:
        """
        Load a CSV file and convert rows to documents
        
        Args:
            file_path: Path to the CSV file
            sample_size: Optional number of rows to sample (for large files)
            
        Returns:
            List of Document objects
        """
        print(f"Loading CSV file: {file_path}")
        
        try:
            # Load CSV with error handling
            df = pd.read_csv(file_path, low_memory=False)
            
            # Sample if requested
            if sample_size and len(df) > sample_size:
                df = df.sample(n=sample_size, random_state=42)
                print(f"Sampled {sample_size} rows from {len(df)} total rows")
            
            documents = []
            
            # Convert each row to a document
            for idx, row in df.iterrows():
                # Create text representation of the row
                text_parts = []
                metadata = {"source": file_path, "row_index": idx}
                
                for col, value in row.items():
                    if pd.notna(value):
                        text_parts.append(f"{col}: {value}")
                        metadata[col] = str(value)
                
                text = " | ".join(text_parts)
                
                doc = Document(
                    page_content=text,
                    metadata=metadata
                )
                documents.append(doc)
            
            print(f"Created {len(documents)} documents from CSV")
            return documents
            
        except Exception as e:
            print(f"Error loading CSV: {e}")
            return []
    
    def load_yaml_metadata(self, yaml_path: str) -> Dict[str, Any]:
        """
        Load YAML metadata file for additional context
        
        Args:
            yaml_path: Path to the YAML file
            
        Returns:
            Dictionary containing YAML metadata
        """
        try:
            # For now, return empty dict since YAML is not essential
            # Can be implemented later if needed
            print(f"YAML loading skipped for: {yaml_path}")
            return {}
        except Exception as e:
            print(f"Error loading YAML: {e}")
            return {}
    
    def add_documents(self, documents: List[Document]) -> None:
        """
        Add documents to the retriever and create embeddings
        
        Args:
            documents: List of Document objects to add
        """
        print(f"Adding {len(documents)} documents to retriever")
        
        # Extract texts for embedding
        texts = [doc.page_content for doc in documents]
        
        # Add to existing documents
        self.documents.extend(documents)
        
        # Fit or transform with TF-IDF
        print("Creating TF-IDF embeddings...")
        if self.embeddings is None:
            # First time: fit and transform
            self.embeddings = self.vectorizer.fit_transform(texts)
        else:
            # Re-fit on all documents
            all_texts = [doc.page_content for doc in self.documents]
            self.embeddings = self.vectorizer.fit_transform(all_texts)
        
        print(f"Total documents in index: {len(self.documents)}")
    
    def retrieve(self, query: str, k: int = 5) -> List[Tuple[Document, float]]:
        """
        Retrieve the top-k most relevant documents for a query with enhanced accuracy
        
        Args:
            query: The user's question
            k: Number of documents to retrieve
            
        Returns:
            List of tuples (Document, similarity_score)
        """
        if not self.documents or self.embeddings is None:
            print("No documents loaded!")
            return []
        
        print(f"Retrieving top {k} documents for query: {query}")
        
        # Enhanced query preprocessing for better matching
        processed_query = self._enhance_query_for_retrieval(query)
        
        # Transform the query using the fitted vectorizer
        query_embedding = self.vectorizer.transform([processed_query])
        
        # Calculate cosine similarities
        similarities = cosine_similarity(query_embedding, self.embeddings).flatten()
        
        # Apply context-aware boosting
        boosted_similarities = self._apply_context_boost(similarities, query)
        
        # Get top-k indices
        top_indices = boosted_similarities.argsort()[-k:][::-1]
        
        # Get documents with scores
        results = []
        for idx in top_indices:
            if idx < len(self.documents) and boosted_similarities[idx] > 0:
                results.append((self.documents[idx], float(boosted_similarities[idx])))
        
        return results
    
    def _enhance_query_for_retrieval(self, query: str) -> str:
        """Enhanced query processing for better retrieval accuracy"""
        # State abbreviation mapping
        state_mapping = {
            'colorado': 'CO', 'co': 'CO',
            'california': 'CA', 'ca': 'CA',
            'alabama': 'AL', 'al': 'AL',
            'texas': 'TX', 'tx': 'TX',
            'florida': 'FL', 'fl': 'FL',
            'new york': 'NY', 'ny': 'NY'
        }
        
        # Health measure standardization
        health_mapping = {
            'obesity': 'OBESITY obesity obese overweight',
            'diabetes': 'DIABETES diabetes diabetic',
            'heart disease': 'CHD coronary heart disease',
            'stroke': 'STROKE cerebrovascular',
            'depression': 'MHLTH mental health depression',
            'asthma': 'CASTHMA asthma respiratory'
        }
        
        processed = query.lower()
        
        # Apply state mappings
        for state_name, abbrev in state_mapping.items():
            if state_name in processed:
                processed = processed.replace(state_name, f"{abbrev} {state_name}")
        
        # Apply health measure mappings
        for condition, expanded in health_mapping.items():
            if condition in processed:
                processed = processed.replace(condition, expanded)
                
        # Add context keywords for better matching
        if 'county' in processed:
            processed += ' CountyName CountyFIPS'
        if 'state' in processed:
            processed += ' StateAbbr StateName'
        if any(word in processed for word in ['data', 'information', 'statistics']):
            processed += ' TotalPopulation Data_Value Measure'
            
        return processed
    
    def _apply_context_boost(self, similarities: np.ndarray, query: str) -> np.ndarray:
        """Apply intelligent context-based boosting for better accuracy"""
        boosted = similarities.copy()
        query_lower = query.lower()
        
        # Extract key entities from query
        states = ['colorado', 'california', 'alabama', 'texas', 'florida', 'co', 'ca', 'al', 'tx', 'fl']
        health_terms = ['obesity', 'diabetes', 'heart', 'stroke', 'depression', 'asthma']
        location_terms = ['county', 'state', 'region', 'area']
        
        for i, doc in enumerate(self.documents):
            doc_content = doc.page_content.lower()
            boost_factor = 1.0
            
            # Strong boost for exact state matches
            for state in states:
                if state in query_lower and state in doc_content:
                    boost_factor *= 1.5  # 50% boost
            
            # Boost for health measure matches
            for health in health_terms:
                if health in query_lower and health in doc_content:
                    boost_factor *= 1.3  # 30% boost
                    
            # Boost for location context
            if any(loc in query_lower for loc in location_terms) and \
               any(loc in doc_content for loc in location_terms):
                boost_factor *= 1.2  # 20% boost
                
            # Penalty for irrelevant matches
            if 'county' in query_lower and 'county' not in doc_content:
                boost_factor *= 0.7  # 30% penalty
                
            boosted[i] *= boost_factor
        
        return boosted
    
    def format_context(self, retrieved_docs: List[Tuple[Document, float]], 
                      query: str, 
                      yaml_metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Format retrieved documents and metadata into a context string
        
        Args:
            retrieved_docs: List of (Document, score) tuples
            query: The original query
            yaml_metadata: Optional YAML metadata
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        # Add YAML metadata if available
        if yaml_metadata:
            context_parts.append("=== Dataset Metadata ===")
            for key, value in yaml_metadata.items():
                if key not in ['columns']:  # Skip large nested structures
                    context_parts.append(f"{key}: {value}")
            context_parts.append("")
        
        # Add retrieved rows
        context_parts.append("=== Relevant Data Rows ===")
        for i, (doc, score) in enumerate(retrieved_docs, 1):
            context_parts.append(f"\n--- Row {i} (Relevance: {score:.3f}) ---")
            
            # Extract key fields from metadata
            metadata = doc.metadata
            for key, value in metadata.items():
                if key not in ['source', 'row_index']:
                    context_parts.append(f"{key}: {value}")
        
        context = "\n".join(context_parts)
        
        # Format the full prompt
        prompt = f"""Based on the following context data, please answer the user's question.

User Question: {query}

Context:
{context}

Please provide a detailed and accurate answer based on the data provided above."""
        
        return prompt


def main():
    """
    Main function to demonstrate the embedding retriever
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Retrieve relevant context from CSV using embeddings')
    parser.add_argument('csv_file', help='Path to CSV file')
    parser.add_argument('question', help='Question to answer')
    parser.add_argument('--sample-size', type=int, default=1000, help='Number of rows to sample')
    parser.add_argument('--top-k', type=int, default=5, help='Number of relevant rows to retrieve')
    parser.add_argument('--output', default='retrieval_results.json', help='Output JSON file')
    
    args = parser.parse_args()
    
    # Initialize retriever
    retriever = EmbeddingRetriever()
    
    # Check for accompanying YAML file
    yaml_file = args.csv_file.replace('.csv', '.yaml')
    yaml_metadata = None
    if os.path.exists(yaml_file):
        yaml_metadata = retriever.load_yaml_metadata(yaml_file)
    
    # Load CSV and create embeddings
    documents = retriever.load_csv(args.csv_file, sample_size=args.sample_size)
    if documents:
        retriever.add_documents(documents)
        
        # Retrieve relevant documents
        results = retriever.retrieve(args.question, k=args.top_k)
        
        # Format and print the prompt
        prompt = retriever.format_context(results, args.question, yaml_metadata)
        
        print("\n" + "="*80)
        print("GENERATED PROMPT FOR LLM:")
        print("="*80)
        print(prompt)
        print("="*80)
        
        # Save results to JSON for integration
        output = {
            "question": args.question,
            "retrieved_rows": [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": float(score)
                }
                for doc, score in results
            ],
            "prompt": prompt
        }
        
        with open(args.output, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()