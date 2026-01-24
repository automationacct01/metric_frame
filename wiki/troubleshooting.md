# Troubleshooting

> **Last Updated:** January 2026
> **Status:** Active Development

---

Solutions to common issues and problems when using MetricFrame.

## Connection Issues

### Backend Not Starting

**Symptoms:**
- API returns connection refused
- Port 8000 not responding

**Solutions:**

1. **Check Docker containers:**
   ```bash
   docker compose ps
   # Verify 'api' container is running
   ```

2. **Check logs:**
   ```bash
   docker compose logs api
   ```

3. **Verify port availability:**
   ```bash
   lsof -i :8000
   # Kill any conflicting process
   ```

4. **Restart backend:**
   ```bash
   docker compose restart api
   ```

### Frontend Not Loading

**Symptoms:**
- Blank page at localhost:5173
- Vite errors in console

**Solutions:**

1. **Check container:**
   ```bash
   docker compose logs web
   ```

2. **Verify npm dependencies:**
   ```bash
   cd frontend
   rm -rf node_modules
   npm install
   ```

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Or clear site data in DevTools

### Database Connection Failed

**Symptoms:**
- "Connection refused" errors
- "Database does not exist" errors

**Solutions:**

1. **Check database container:**
   ```bash
   docker compose ps db
   docker compose logs db
   ```

2. **Verify connection string:**
   ```bash
   # In backend/.env
   DATABASE_URL=postgresql://postgres:postgres@db:5432/metricframe
   ```

3. **Recreate database:**
   ```bash
   docker compose down -v
   docker compose up -d db
   # Wait for db to start
   docker compose up -d api
   ```

4. **Test connection:**
   ```bash
   docker exec -it metricframe_db psql -U postgres -d metricframe -c "SELECT 1"
   ```

## AI Integration Issues

### AI Assistant Not Responding

**Symptoms:**
- AI chat returns errors
- Timeout messages
- Empty responses

**Solutions:**

1. **Verify API key:**
   ```bash
   # Check backend/.env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Test API key:**
   ```bash
   curl -X POST https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "content-type: application/json" \
     -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'
   ```

3. **Check rate limits:**
   - Wait if rate limited
   - Check Anthropic dashboard for usage

4. **Increase timeout:**
   ```bash
   # In backend/.env
   AI_TIMEOUT=60
   ```

### AI Mapping Errors

**Symptoms:**
- CSF mapping suggestions fail
- Enhancement endpoint returns errors

**Solutions:**

1. **Check request format:**
   - Ensure metrics have name field
   - Verify JSON structure

2. **Reduce batch size:**
   - Process fewer metrics at once
   - Maximum 50 metrics per request

3. **Check logs:**
   ```bash
   docker compose logs api | grep -i "ai"
   ```

## Database Issues

### Migration Failures

**Symptoms:**
- "Target database is not up to date" errors
- "Can't locate revision" errors

**Solutions:**

1. **Check current state:**
   ```bash
   cd backend
   alembic current
   ```

2. **View history:**
   ```bash
   alembic history
   ```

3. **Force upgrade:**
   ```bash
   alembic stamp head
   alembic upgrade head
   ```

4. **Reset migrations (development only):**
   ```bash
   docker compose down -v
   docker compose up -d db
   alembic upgrade head
   ```

### Seeding Failures

**Symptoms:**
- "Relation does not exist" errors
- Missing metrics after startup

**Solutions:**

1. **Run migrations first:**
   ```bash
   alembic upgrade head
   ```

2. **Re-run seed:**
   ```bash
   python -m src.seeds.seed_metrics
   ```

3. **Check for existing data:**
   ```bash
   docker exec -it metricframe_db psql -U postgres -d metricframe \
     -c "SELECT COUNT(*) FROM metrics"
   ```

### Data Corruption

**Symptoms:**
- Inconsistent scores
- Missing relationships

**Solutions:**

1. **Verify data integrity:**
   ```sql
   -- Check orphaned catalog items
   SELECT * FROM metric_catalog_items
   WHERE catalog_id NOT IN (SELECT id FROM metric_catalogs);
   ```

2. **Rebuild scores cache:**
   ```bash
   # Call score recalculation endpoint
   curl -X POST http://localhost:8000/api/v1/scores/recalculate
   ```

## Performance Issues

### Slow Dashboard Load

**Symptoms:**
- Dashboard takes >5 seconds to load
- Score cards appear slowly

**Solutions:**

1. **Check query performance:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM metrics WHERE csf_function = 'PR';
   ```

2. **Verify indices exist:**
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'metrics';
   ```

3. **Optimize queries:**
   - Add missing indices
   - Use pagination for large datasets

4. **Enable caching:**
   ```bash
   # In backend/.env
   CACHE_SCORES=true
   CACHE_TTL=300
   ```

### High Memory Usage

**Symptoms:**
- Containers using excessive memory
- OOM (Out of Memory) errors

**Solutions:**

1. **Check container resources:**
   ```bash
   docker stats
   ```

2. **Limit container memory:**
   ```yaml
   # docker-compose.yml
   services:
     api:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Reduce batch sizes:**
   - Import smaller CSV files
   - Process fewer metrics at once

## Common Error Messages

### "Metric not found"

**Cause:** Attempting to access deleted or non-existent metric

**Solution:**
- Verify metric ID exists
- Refresh metrics list
- Check if metric was deleted

### "Catalog activation failed"

**Cause:** Cannot activate catalog

**Solutions:**
- Ensure catalog has at least one metric
- Check user permissions
- Verify no validation errors

### "Invalid CSF mapping"

**Cause:** Function/category combination doesn't exist

**Solution:**
- Use CSF validation endpoint first
- Check available categories for function
- Refer to [Frameworks Reference](frameworks-reference.md)

### "Score calculation failed"

**Cause:** Missing or invalid metric values

**Solutions:**
- Ensure current_value and target_value set
- Check direction type is valid
- Verify no null values in required fields

### "Import validation error"

**Cause:** CSV import contains invalid data

**Solutions:**
- Check CSV encoding (use UTF-8)
- Verify required columns present
- Remove special characters from values
- Check for empty rows

## Getting Help

### Documentation Resources

| Resource | Location |
|----------|----------|
| Wiki | This documentation |
| API Docs | http://localhost:8000/docs |
| README | Repository root |

### Diagnostic Commands

```bash
# Full system status
docker compose ps
docker compose logs --tail=50

# Backend health
curl http://localhost:8000/health

# Database connectivity
docker exec metricframe_db pg_isready

# Container resource usage
docker stats --no-stream
```

### Reporting Issues

When reporting issues, include:

1. **Environment:**
   - Operating system
   - Docker version
   - Browser (for frontend issues)

2. **Steps to reproduce:**
   - Exact sequence of actions
   - Expected vs actual behavior

3. **Logs:**
   ```bash
   # Capture logs
   docker compose logs > logs.txt
   ```

4. **Screenshots:**
   - Error messages
   - Unexpected UI states

### GitHub Issues

Report bugs and request features at:
[https://github.com/your-org/metricframe/issues](https://github.com/your-org/metricframe/issues)

---

**Back to:** [Home](home.md) - Wiki main page
