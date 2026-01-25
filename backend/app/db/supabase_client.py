"""Supabase REST API Client for database operations."""
import httpx
from typing import Any, Optional
from datetime import datetime

from app.core.config import settings


class SupabaseClient:
    """Supabase REST API 클라이언트 (PostgREST 사용)"""

    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY  # 서버에서는 service_role 키 사용
        self.rest_url = f"{self.url}/rest/v1"
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",  # INSERT/UPDATE 후 결과 반환
        }
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def table(self, table_name: str) -> "TableQuery":
        """Start a query on a table."""
        return TableQuery(self, table_name)


class TableQuery:
    """PostgREST 스타일 테이블 쿼리 빌더"""

    def __init__(self, client: SupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
        self._select_columns = "*"
        self._filters: list[str] = []
        self._order: Optional[str] = None
        self._limit: Optional[int] = None
        self._offset: Optional[int] = None
        self._single = False

    def select(self, columns: str = "*") -> "TableQuery":
        """Select columns."""
        self._select_columns = columns
        return self

    def eq(self, column: str, value: Any) -> "TableQuery":
        """Filter: column equals value."""
        if value is None:
            self._filters.append(f"{column}=is.null")
        else:
            self._filters.append(f"{column}=eq.{value}")
        return self

    def neq(self, column: str, value: Any) -> "TableQuery":
        """Filter: column not equals value."""
        self._filters.append(f"{column}=neq.{value}")
        return self

    def gt(self, column: str, value: Any) -> "TableQuery":
        """Filter: column greater than value."""
        self._filters.append(f"{column}=gt.{value}")
        return self

    def gte(self, column: str, value: Any) -> "TableQuery":
        """Filter: column greater than or equal to value."""
        self._filters.append(f"{column}=gte.{value}")
        return self

    def lt(self, column: str, value: Any) -> "TableQuery":
        """Filter: column less than value."""
        self._filters.append(f"{column}=lt.{value}")
        return self

    def lte(self, column: str, value: Any) -> "TableQuery":
        """Filter: column less than or equal to value."""
        self._filters.append(f"{column}=lte.{value}")
        return self

    def like(self, column: str, pattern: str) -> "TableQuery":
        """Filter: column matches pattern (case sensitive)."""
        self._filters.append(f"{column}=like.{pattern}")
        return self

    def ilike(self, column: str, pattern: str) -> "TableQuery":
        """Filter: column matches pattern (case insensitive)."""
        self._filters.append(f"{column}=ilike.{pattern}")
        return self

    def is_(self, column: str, value: Any) -> "TableQuery":
        """Filter: column is value (for null, true, false)."""
        self._filters.append(f"{column}=is.{str(value).lower()}")
        return self

    def in_(self, column: str, values: list) -> "TableQuery":
        """Filter: column in list of values."""
        values_str = ",".join(str(v) for v in values)
        self._filters.append(f"{column}=in.({values_str})")
        return self

    def order(self, column: str, desc: bool = False, nullsfirst: bool = False) -> "TableQuery":
        """Order by column."""
        order_str = column
        if desc:
            order_str += ".desc"
        else:
            order_str += ".asc"
        if nullsfirst:
            order_str += ".nullsfirst"
        self._order = order_str
        return self

    def limit(self, count: int) -> "TableQuery":
        """Limit number of results."""
        self._limit = count
        return self

    def offset(self, count: int) -> "TableQuery":
        """Offset results."""
        self._offset = count
        return self

    def single(self) -> "TableQuery":
        """Return single result (will error if not exactly one)."""
        self._single = True
        self._limit = 1
        return self

    def maybe_single(self) -> "TableQuery":
        """Return single result or None."""
        self._single = True
        self._limit = 1
        return self

    def _build_url(self) -> str:
        """Build the full URL with query parameters."""
        url = f"{self.client.rest_url}/{self.table_name}"
        params = []

        if self._select_columns != "*":
            params.append(f"select={self._select_columns}")

        params.extend(self._filters)

        if self._order:
            params.append(f"order={self._order}")

        if self._limit is not None:
            params.append(f"limit={self._limit}")

        if self._offset is not None:
            params.append(f"offset={self._offset}")

        if params:
            url += "?" + "&".join(params)

        return url

    async def execute(self) -> "QueryResult":
        """Execute the SELECT query."""
        client = await self.client._get_client()
        url = self._build_url()

        response = await client.get(url, headers=self.client.headers)

        return QueryResult(response, single=self._single)

    def insert(self, data: dict | list[dict]) -> "InsertQuery":
        """Insert data into table. Chain with .execute() to run."""
        return InsertQuery(self.client, self.table_name, data)

    def update(self, data: dict) -> "UpdateQuery":
        """Update matching rows. Chain with .execute() to run."""
        return UpdateQuery(self.client, self.table_name, data, self._filters, self._single)

    def delete(self) -> "DeleteQuery":
        """Delete matching rows. Chain with .execute() to run."""
        return DeleteQuery(self.client, self.table_name, self._filters, self._single)

    def upsert(self, data: dict | list[dict], on_conflict: str = "id") -> "UpsertQuery":
        """Insert or update data. Chain with .execute() to run."""
        return UpsertQuery(self.client, self.table_name, data, on_conflict)

    def _convert_dates(self, data: dict) -> dict:
        """Convert datetime objects to ISO format strings."""
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result


class InsertQuery:
    """INSERT 쿼리 빌더"""

    def __init__(self, client: SupabaseClient, table_name: str, data: dict | list[dict]):
        self.client = client
        self.table_name = table_name
        self.data = data

    def _convert_dates(self, data: dict) -> dict:
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result

    async def execute(self) -> "QueryResult":
        """Execute INSERT query."""
        http_client = await self.client._get_client()
        url = f"{self.client.rest_url}/{self.table_name}"

        data = self.data
        if isinstance(data, dict):
            data = self._convert_dates(data)
        elif isinstance(data, list):
            data = [self._convert_dates(d) for d in data]

        response = await http_client.post(url, headers=self.client.headers, json=data)
        return QueryResult(response, single=isinstance(self.data, dict))


class UpdateQuery:
    """UPDATE 쿼리 빌더"""

    def __init__(self, client: SupabaseClient, table_name: str, data: dict, filters: list[str], single: bool):
        self.client = client
        self.table_name = table_name
        self.data = data
        self._filters = filters
        self._single = single

    def _convert_dates(self, data: dict) -> dict:
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result

    def _build_url(self) -> str:
        url = f"{self.client.rest_url}/{self.table_name}"
        if self._filters:
            url += "?" + "&".join(self._filters)
        return url

    async def execute(self) -> "QueryResult":
        """Execute UPDATE query."""
        http_client = await self.client._get_client()
        url = self._build_url()
        data = self._convert_dates(self.data)
        response = await http_client.patch(url, headers=self.client.headers, json=data)
        return QueryResult(response, single=self._single)


class DeleteQuery:
    """DELETE 쿼리 빌더"""

    def __init__(self, client: SupabaseClient, table_name: str, filters: list[str], single: bool):
        self.client = client
        self.table_name = table_name
        self._filters = filters
        self._single = single

    def _build_url(self) -> str:
        url = f"{self.client.rest_url}/{self.table_name}"
        if self._filters:
            url += "?" + "&".join(self._filters)
        return url

    async def execute(self) -> "QueryResult":
        """Execute DELETE query."""
        http_client = await self.client._get_client()
        url = self._build_url()
        response = await http_client.delete(url, headers=self.client.headers)
        return QueryResult(response, single=self._single)


class UpsertQuery:
    """UPSERT 쿼리 빌더"""

    def __init__(self, client: SupabaseClient, table_name: str, data: dict | list[dict], on_conflict: str):
        self.client = client
        self.table_name = table_name
        self.data = data
        self.on_conflict = on_conflict

    def _convert_dates(self, data: dict) -> dict:
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result

    async def execute(self) -> "QueryResult":
        """Execute UPSERT query."""
        http_client = await self.client._get_client()
        url = f"{self.client.rest_url}/{self.table_name}"

        headers = {**self.client.headers}
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"

        data = self.data
        if isinstance(data, dict):
            data = self._convert_dates(data)
        elif isinstance(data, list):
            data = [self._convert_dates(d) for d in data]

        response = await http_client.post(url, headers=headers, json=data)
        return QueryResult(response, single=isinstance(self.data, dict))


class QueryResult:
    """Query result wrapper."""

    def __init__(self, response: httpx.Response, single: bool = False):
        self.response = response
        self._single = single
        self._data: Optional[list | dict] = None
        self._error: Optional[dict] = None

        self._parse_response()

    def _parse_response(self):
        """Parse the HTTP response."""
        if self.response.status_code >= 400:
            try:
                self._error = self.response.json()
            except:
                self._error = {"message": self.response.text}
        else:
            try:
                data = self.response.json()
                if self._single and isinstance(data, list):
                    self._data = data[0] if data else None
                else:
                    self._data = data
            except:
                self._data = None

    @property
    def data(self) -> Any:
        """Get the response data."""
        return self._data

    @property
    def error(self) -> Optional[dict]:
        """Get the error if any."""
        return self._error

    @property
    def count(self) -> int:
        """Get the count of results."""
        if isinstance(self._data, list):
            return len(self._data)
        elif self._data is not None:
            return 1
        return 0


# 싱글톤 인스턴스
_supabase_client: Optional[SupabaseClient] = None


def get_supabase() -> SupabaseClient:
    """Get the Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client


async def close_supabase():
    """Close the Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        await _supabase_client.close()
        _supabase_client = None
