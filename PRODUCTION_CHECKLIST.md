# Production Deployment Checklist

Use this checklist to ensure MCP tools are fully functional in your production environment.

## Pre-Deployment

### Code & Configuration
- [ ] Review `DEPLOYMENT_MCP_TOOLS.md` for deployment instructions
- [ ] Review `MCP_TOOLS_API.md` for API reference
- [ ] Verify `backend/src/server/mcp_integration.py` is present
- [ ] Verify `backend/src/server/http_api.py` includes MCP endpoints
- [ ] Verify `backend/src/main.py` initializes MCP tools
- [ ] Check that all MCP tool imports are correct

### Environment Variables
- [ ] Collect all required Databricks credentials
- [ ] Collect Anthropic API key
- [ ] Prepare CORS domain configuration
- [ ] (Optional) Prepare SMTP configuration for email alerts

### Testing Locally
- [ ] Run `python -m src.main` and verify backend starts
- [ ] Visit `http://localhost:8080/api/health` - should return 200
- [ ] Visit `http://localhost:8080/api/mcp/tools` - should list tools
- [ ] Visit `http://localhost:8080/api/mcp/config` - should show config
- [ ] Test chat functionality with a simple message
- [ ] Verify all MCP tools respond correctly

## Vercel Deployment

### Before Deployment
- [ ] Ensure all changes are committed: `git status` shows clean
- [ ] Verify `vercel.json` is configured
- [ ] Run `vercel --version` to ensure CLI is installed

### Configure Environment
- [ ] Log in to Vercel dashboard
- [ ] Go to your project Settings > Environment Variables
- [ ] Add `BACKEND_MODE=http` (or leave empty for default)
- [ ] Add `DATABRICKS_HOST=https://your-workspace.cloud.databricks.com`
- [ ] Add `DATABRICKS_TOKEN=<your-databricks-pat>`
- [ ] Add `DATABRICKS_WAREHOUSE_ID=<your-warehouse-id>`
- [ ] Add `DATABRICKS_DEFAULT_CATALOG=<your-catalog>`
- [ ] Add `DATABRICKS_DEFAULT_SCHEMA=<your-schema>`
- [ ] Add `ANTHROPIC_API_KEY=<your-api-key>`
- [ ] Add `CORS_ALLOWED_ORIGIN=https://your-production-domain`
- [ ] (Optional) Add SMTP variables for email alerts

### Deploy
- [ ] Run `git push` to trigger deployment
- [ ] Monitor Vercel dashboard for build completion
- [ ] Wait for deployment to complete (typically 5-10 minutes)

### Verify After Deployment
- [ ] Visit `https://your-app.vercel.app/api/health` - should return 200
- [ ] Visit `https://your-app.vercel.app/api/mcp/tools` - should list 12 tools
- [ ] Visit `https://your-app.vercel.app/api/mcp/config` - should show config
- [ ] Test frontend login and chat functionality
- [ ] Test a chat message that uses MCP tools
- [ ] Check Vercel logs for any errors: `vercel logs`

### Validate MCP Tools
```bash
# List tools
curl https://your-app.vercel.app/api/mcp/tools | jq '.count'
# Should output: 12

# Test Databricks connection
curl https://your-app.vercel.app/api/databricks/ping

# List jobs
curl https://your-app.vercel.app/api/jobs

# List pipelines
curl https://your-app.vercel.app/api/pipelines
```

## Netlify Deployment

### Before Deployment
- [ ] Ensure all changes are committed
- [ ] Verify `netlify.toml` is configured
- [ ] Run `netlify --version` to ensure CLI is installed

### Configure Environment
- [ ] Log in to Netlify dashboard
- [ ] Go to your site Settings > Build & Deploy > Environment
- [ ] Add all environment variables (same as Vercel list above)

### Deploy
- [ ] Run `git push` to trigger deployment
- [ ] Monitor Netlify dashboard for build completion
- [ ] Wait for deployment to complete

### Verify After Deployment
- [ ] Visit `https://your-app.netlify.app/api/health` - should return 200
- [ ] Visit `https://your-app.netlify.app/api/mcp/tools` - should list 12 tools
- [ ] Visit `https://your-app.netlify.app/api/mcp/config` - should show config
- [ ] Check Netlify logs for any errors

## Post-Deployment Validation

### Functional Tests
- [ ] Frontend loads successfully
- [ ] User can log in with email/password
- [ ] Chat interface loads
- [ ] Can send a chat message
- [ ] Chat uses MCP tools to fetch Databricks data
- [ ] Job list page loads and shows jobs
- [ ] Pipeline list page loads and shows pipelines
- [ ] Cluster list page loads and shows clusters
- [ ] Can trigger a job from the UI
- [ ] Can start/stop a pipeline from the UI

### MCP Tools Verification
- [ ] `databricks_validate_connection_config` works
- [ ] `databricks_ping` works
- [ ] `databricks_jobs_status` returns data
- [ ] `databricks_pipelines_status` returns data
- [ ] `db_ai_kit_skills_list` returns skills
- [ ] Claude can invoke tools in chat

### Error Handling
- [ ] Invalid Databricks credentials show appropriate error
- [ ] Network timeouts are handled gracefully
- [ ] CORS errors are resolved (no 403 errors from frontend)
- [ ] Chat error messages are helpful

### Monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Set up performance monitoring
- [ ] Configure alerts for 5xx errors
- [ ] Enable CORS error tracking

## Troubleshooting During Deployment

### Build Fails
- [ ] Check `backend/requirements.txt` for Python dependency issues
- [ ] Check `frontend/package.json` for npm dependency issues
- [ ] Review deployment logs for specific error messages
- [ ] Verify all required environment variables are set

### MCP Tools Not Responding
- [ ] Verify `DATABRICKS_HOST` is correct format (https://...)
- [ ] Verify `DATABRICKS_TOKEN` is valid
- [ ] Check `ANTHROPIC_API_KEY` is set
- [ ] Review backend logs for initialization errors
- [ ] Test health endpoint first: `/api/health`

### Frontend Not Communicating with Backend
- [ ] Verify `CORS_ALLOWED_ORIGIN` matches your frontend domain
- [ ] Check browser console for CORS errors
- [ ] Verify backend is responding: `curl /api/health`
- [ ] Check authentication headers in API calls

### Chat Not Using Tools
- [ ] Verify all MCP tools list correctly
- [ ] Check Anthropic API key is valid
- [ ] Review backend logs for tool invocation errors
- [ ] Test individual tool endpoints directly

## Rollback Plan

If something goes wrong in production:

### Vercel Rollback
1. Go to Vercel dashboard > Deployments
2. Find the previous successful deployment
3. Click the three dots and select "Rollback to this Deployment"
4. Wait for rollback to complete

### Netlify Rollback
1. Go to Netlify dashboard > Deploys
2. Find the previous successful deployment
3. Click "Restore this deploy"
4. Wait for deployment to complete

### Manual Rollback
1. Revert commits: `git revert <commit-hash>`
2. Push: `git push`
3. Wait for new deployment to complete

## Success Criteria

Your production deployment is successful when:

✅ All 12 MCP tools are listed at `/api/mcp/tools`
✅ `/api/mcp/config` returns server configuration
✅ Chat messages trigger MCP tool invocations
✅ Databricks operations work from chat and UI
✅ Frontend loads without CORS errors
✅ No 5xx errors in deployment logs
✅ Users can log in and use the dashboard
✅ MCP tools are documented and discoverable

## Performance Baseline

For reference, expected response times:

- Health check: < 50ms
- MCP tools list: < 100ms
- Databricks operations: 1-5 seconds (depending on workspace size)
- Chat messages: 5-15 seconds (Claude processing time)

## Contact & Support

If you encounter issues:
1. Check the logs in your deployment platform
2. Review `DEPLOYMENT_MCP_TOOLS.md` for detailed instructions
3. Test endpoints individually using cURL or Postman
4. Check environment variables are correctly set
5. Verify credentials are valid
