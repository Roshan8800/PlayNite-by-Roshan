# Video Database Files

## Files in this directory

### pornhub.com-db.csv
- **Size**: ~16 GB
- **Records**: 4,246,264 videos
- **Format**: Pipe-delimited CSV
- **Content**: Video metadata with iframe embeds

### deleted.csv
- **Size**: ~1.9 GB
- **Records**: 22,743,830 entries
- **Format**: CSV with video IDs and URLs
- **Content**: Records of deleted videos

## Git Large File Storage (LFS) Note

⚠️ **Important**: These files are extremely large (18GB total) and may require Git LFS for proper version control.

If you encounter issues with git operations on these files, you may need to:

1. Install Git LFS:
   ```bash
   git lfs install
   ```

2. Track the CSV files with LFS:
   ```bash
   git lfs track "*.csv"
   git add .gitattributes
   ```

3. Or add to `.gitignore` and store separately:
   ```
   pornhub-database/*.csv
   ```

## Database Integration

These files are automatically loaded by the PlayNite application via:
- `/src/lib/services/video-database-service.ts`
- API endpoints at `/api/videos/*`

See `VIDEO_DATABASE_INTEGRATION.md` in the root directory for complete documentation.

## File Location

The VideoDatabaseService expects these files at:
```
process.cwd() + '/pornhub-database/'
```

This resolves to `/workspace/pornhub-database/` in the current environment.

## Usage

No manual intervention required. The files are automatically read and parsed by the application when:
1. Accessing the `/videos` page
2. Making API calls to `/api/videos/database`
3. Requesting statistics via `/api/videos/stats`

## Performance

- **Parsing**: Batched processing (10K records at a time)
- **Memory**: ~500MB-1GB during active queries
- **Cache**: Query results cached for fast repeated access
- **Stats**: Sample-based calculation for efficiency
