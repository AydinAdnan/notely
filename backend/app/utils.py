def extract_public_token(public_links) -> str | None:
    """
    supabase-py returns joined one-to-one relations (unique FK) as a dict,
    and one-to-many as a list. Handle both so callers don't crash.
    """
    if not public_links:
        return None
    if isinstance(public_links, dict):
        return public_links.get("token")
    if isinstance(public_links, list) and public_links:
        return public_links[0].get("token")
    return None
