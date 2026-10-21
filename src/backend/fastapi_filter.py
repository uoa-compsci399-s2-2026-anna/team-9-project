from fastapi import HTTPException, Response
from fastapi.staticfiles import StaticFiles


class SrcFilteredStaticFiles(StaticFiles):
    """
    Filters file access for files in the /src statically served endpoint
    """
    BLOCKED_FOLDERS = ["backend"]
    
    async def get_response(self, path: str, scope) -> Response:
        # Iterate over the blocked folders list
        for folder_name in self.BLOCKED_FOLDERS:
            # If the folder is part of the path
            if folder_name in path:
                # Block access via 404
                print(f"Attempted illegal access of file in ./src/{folder_name}")
                raise HTTPException(404)
        
        # Otherwise return with default behaviour
        return await super().get_response(path, scope)