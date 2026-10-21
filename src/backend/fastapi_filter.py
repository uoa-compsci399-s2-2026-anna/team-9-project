from fastapi import HTTPException, Response
from fastapi.staticfiles import StaticFiles

BLOCKED_FOLDERS = ["backend"]

class FilteredStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope) -> Response:
        for folder_name in BLOCKED_FOLDERS:
            if folder_name in path:
                raise HTTPException(404)
        
        return await super().get_response(path, scope)