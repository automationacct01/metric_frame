"""Web search service abstraction.

Supports multiple search backends:
- DuckDuckGo (free, no API key, default)
- Tavily (premium, API key required, AI-optimized results)

Search results are formatted as text context that can be injected
into AI prompts to augment responses with real-time information.
"""
import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

logger = logging.getLogger(__name__)


class SearchProvider(str, Enum):
    """Supported search providers."""
    DUCKDUCKGO = "duckduckgo"
    TAVILY = "tavily"


@dataclass
class SearchResult:
    """A single search result."""
    title: str
    url: str
    snippet: str
    source: str = ""


@dataclass
class SearchResponse:
    """Response from a search operation."""
    query: str
    results: List[SearchResult] = field(default_factory=list)
    provider: SearchProvider = SearchProvider.DUCKDUCKGO


class BaseSearchProvider(ABC):
    """Abstract base for search provider implementations."""

    @abstractmethod
    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """Execute a search query.

        Args:
            query: The search query string
            max_results: Maximum number of results to return

        Returns:
            List of SearchResult objects
        """
        pass


class DuckDuckGoSearchProvider(BaseSearchProvider):
    """Free search via the duckduckgo-search library.

    No API key required. Rate limited but sufficient for typical usage.
    """

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        from ddgs import DDGS

        def _search():
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=max_results))

        raw = await asyncio.to_thread(_search)
        return [
            SearchResult(
                title=r.get("title", ""),
                url=r.get("href", ""),
                snippet=r.get("body", ""),
                source="DuckDuckGo",
            )
            for r in raw
        ]


class TavilySearchProvider(BaseSearchProvider):
    """Premium search via Tavily API.

    Requires an API key. Returns AI-optimized, clean text results.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        from tavily import TavilyClient

        def _search():
            client = TavilyClient(api_key=self.api_key)
            return client.search(query, max_results=max_results)

        response = await asyncio.to_thread(_search)
        return [
            SearchResult(
                title=r.get("title", ""),
                url=r.get("url", ""),
                snippet=r.get("content", ""),
                source="Tavily",
            )
            for r in response.get("results", [])
        ]


class SearchService:
    """Main search service with provider selection and result formatting.

    Usage:
        service = SearchService()  # Uses DuckDuckGo by default
        response = await service.search("cybersecurity MTTD benchmarks")
        context = SearchService.format_results_for_context(response)
    """

    def __init__(
        self,
        provider: SearchProvider = SearchProvider.DUCKDUCKGO,
        tavily_api_key: Optional[str] = None,
    ):
        if provider == SearchProvider.TAVILY and tavily_api_key:
            self._provider = TavilySearchProvider(api_key=tavily_api_key)
        else:
            self._provider = DuckDuckGoSearchProvider()
        self._provider_type = provider

    async def search(self, query: str, max_results: int = 5) -> SearchResponse:
        """Execute a search and return formatted response.

        Args:
            query: The search query
            max_results: Maximum results to return

        Returns:
            SearchResponse with results (empty list on failure)
        """
        try:
            results = await self._provider.search(query, max_results)
            return SearchResponse(
                query=query,
                results=results,
                provider=self._provider_type,
            )
        except Exception as e:
            logger.error(f"Search failed ({self._provider_type.value}): {e}")
            return SearchResponse(
                query=query,
                results=[],
                provider=self._provider_type,
            )

    @staticmethod
    def format_results_for_context(response: SearchResponse) -> str:
        """Format search results as text context for AI prompt injection.

        Args:
            response: SearchResponse to format

        Returns:
            Formatted string, or empty string if no results
        """
        if not response.results:
            return ""

        lines = [f'--- Web Search Results for: "{response.query}" ---\n']
        for i, r in enumerate(response.results, 1):
            lines.append(f"{i}. {r.title}")
            lines.append(f"   URL: {r.url}")
            lines.append(f"   {r.snippet}\n")
        lines.append("--- End of Search Results ---")
        return "\n".join(lines)
