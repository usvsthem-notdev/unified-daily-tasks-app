# 🔧 Troubleshooting Guide: User Task Assignment Issues

## Problem Summary

**Issue**: The `/tasks` command was not finding tasks assigned to users in Monday.com.

**Root Cause**: The application was passing Slack user IDs (e.g., `U01234ABCD`) to Monday.com queries, but Monday.com stores assignees by email address or full name (e.g., `john.doe@company.com` or `John Doe`). This mismatch meant the text matching always failed.

---

## ✅ The Fix

We've implemented a comprehensive solution with three key components:

### 1. **User Mapping Service** (`src/services/userMapping.js`)
- Translates Slack user IDs to Monday.com identifiers (email or name)
- Fetches user email from Slack profile using `users.info` API
- Falls back to display name if email unavailable
- Implements caching for performance

### 2. **Enhanced Monday Service** (`src/services/monday.js`)
- Updated `classifyTasks()` method to accept email/name instead of Slack user ID
- Improved matching logic with multiple strategies:
  - Direct substring matching
  - Email username extraction (john.doe from john.doe@company.com)
  - Name part matching (splits "John Doe" and matches both parts)
- Case-insensitive matching with trimming
- Added debug logging for troubleshooting

### 3. **Updated Tasks Command** (`src/commands/tasks.js`)
- Now calls user mapping service before querying Monday.com
- Passes Monday.com identifier instead of Slack user ID
- Enhanced error messages with troubleshooting tips
- Shows user identifier in debug footer

---

## 📋 Verification Checklist

Before the fix works, ensure:

### ✅ **Slack Configuration**
1. **Bot token has correct scopes**:
   ```
   chat:write
   commands
   users:read        ← CRITICAL for email lookup
   users:read.email  ← CRITICAL for email lookup
   channels:read
   ```

2. **Users have email in Slack profile**:
   - Go to Slack workspace → Settings → Profile
   - Verify email address is set
   - This must match Monday.com email

### ✅ **Monday.com Configuration**
1. **Tasks are assigned properly**:
   - Open your Monday.com board
   - Check the "Person" or "Assignee" column
   - Verify it contains the user's email or full name
   - The text should exactly match what's in Slack

2. **API access**:
   - Verify `MONDAY_API_KEY` has read access to all boards
   - Test with Monday.com API playground if needed

### ✅ **Environment Variables**
Ensure `.env` contains:
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
MONDAY_API_KEY=your-monday-api-key
```

---

## 🐛 Debugging Steps

If tasks still aren't showing up:

### Step 1: Check Logs for User Mapping
Look for these log messages:
```
Mapped Slack user U01234ABCD to email: john.doe@company.com
```

**If you see**:
- ✅ `Mapped Slack user ... to email: ...` → User mapping working
- ❌ `No email found for Slack user ...` → User needs email in Slack profile
- ❌ `Error fetching Slack user email` → Check bot token scopes

### Step 2: Check Classification Logs
Look for:
```
Classifying tasks for user identifier: john.doe@company.com
Normalized identifier: john.doe@company.com
Task "Review PR": Assignee="john.doe@company.com, jane.smith@company.com", Match=true
```

**If Match=false for your tasks**:
- Check Monday.com person column text
- Verify email/name format matches exactly
- Try different matching strategies below

### Step 3: Test Matching Manually
In Monday.com, check what text appears in the person column:
- Format 1: `john.doe@company.com`
- Format 2: `John Doe`
- Format 3: `john.doe@company.com, jane.smith@company.com` (multiple assignees)

The code handles all three formats!

### Step 4: Run Test Command
Add this temporary debugging endpoint to `app.js`:
```javascript
receiver.router.get('/debug/user/:slackUserId', async (req, res) => {
  try {
    const mondayId = await userMappingService.getMondayIdentifier(req.params.slackUserId);
    const result = await mondayService.getAllUserTasks(mondayId);
    
    res.json({
      slackUserId: req.params.slackUserId,
      mondayIdentifier: mondayId,
      totalTasks: result.classified.myTasks.length,
      tasks: result.classified.myTasks.slice(0, 5).map(t => ({
        name: t.name,
        assignee: t.column_values.find(cv => 
          cv.type === 'person' || cv.type === 'multiple-person'
        )?.text
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then visit: `http://localhost:3000/debug/user/U01234ABCD`

---

## 🔍 Common Issues & Solutions

### Issue 1: "No email found for Slack user"
**Cause**: User hasn't set email in Slack profile  
**Solution**:
1. User goes to Slack → Profile → Edit Profile
2. Add email address (must match Monday.com)
3. Save changes
4. Try `/tasks` command again

### Issue 2: "No tasks found assigned to [email]"
**Cause**: Email doesn't match Monday.com assignment  
**Solutions**:
- **Option A**: Update Monday.com assignments to use exact email
- **Option B**: Check if name is used instead, ensure Slack display name matches
- **Option C**: Check board permissions - user might not have access

### Issue 3: Tasks exist but show 0 results
**Cause**: Monday.com person column has different format  
**Debug**:
1. Check actual text in Monday.com person column
2. Look at classification logs for Match=false
3. May need to adjust matching logic for your specific format

### Issue 4: Some tasks found, but not all
**Cause**: Inconsistent assignment format across boards  
**Solution**: Standardize how people are assigned:
- Use email everywhere, OR
- Use full name everywhere
- Avoid mixing formats

---

## 🚀 Testing the Fix

### Test Script
```bash
# 1. Restart the application
npm start

# 2. Check logs show user mapping initialized
# Look for: "✅ User mapping service initialized"

# 3. Run /tasks command in Slack
# Should see: "⏳ Fetching your tasks from all boards..."

# 4. Check server logs for:
# - "Slack user U... mapped to Monday identifier: email@company.com"
# - "Classification complete: X tasks assigned to user"
# - "Tasks command completed in Xms - Found X tasks"

# 5. Verify response in Slack shows your tasks
```

### Expected Behavior
✅ **Before Fix**: 
```
📋 You have no tasks assigned to you across any boards.
```

✅ **After Fix**:
```
📋 Your Tasks Across All Boards

🚨 Overdue (2)
• Review PR #123 - Engineering Board
  Due: 10/15/2024

📅 Due Today (3)
• Deploy hotfix - Operations
...
```

---

## 📊 Performance Considerations

The fix adds minimal overhead:
- **User email lookup**: ~50-100ms (cached after first call)
- **Monday.com queries**: Same as before
- **Matching logic**: ~1-5ms per task

Total impact: +50-100ms on first `/tasks` call per user, negligible on subsequent calls.

---

## 🔐 Security Notes

- User emails are cached in memory (not persisted)
- Cache can be cleared: `userMappingService.clearCache()`
- Emails are only used for Monday.com matching
- No PII is logged (emails only shown in debug mode)

---

## 📞 Still Having Issues?

If tasks still don't appear after following this guide:

1. **Enable debug logging**: Set `LOG_LEVEL=debug` in `.env`
2. **Collect diagnostics**:
   ```bash
   # Get user mapping
   curl http://localhost:3000/debug/user/YOUR_SLACK_USER_ID
   
   # Check application health
   curl http://localhost:3000/health
   
   # View metrics
   curl http://localhost:3000/metrics
   ```
3. **Check Monday.com API directly**:
   - Go to [Monday.com API Playground](https://monday.com/developers/v2/try-it-yourself)
   - Query your boards and items
   - Verify person column values

4. **Create a GitHub issue** with:
   - Logs showing user mapping
   - Logs showing classification
   - Example Monday.com person column text
   - Slack user email format

---

## 🎯 Quick Reference: How It Works Now

```
User runs /tasks in Slack
         ↓
[Slack] User ID: U01234ABCD
         ↓
[UserMapping] Lookup email → john.doe@company.com
         ↓
[Monday] Query all boards
         ↓
[Monday] For each task:
         Check if "john.doe@company.com" in assignee text
         ↓
[Slack] Display: "Found 15 tasks for john.doe@company.com"
```

---

## 📝 Additional Resources

- [Slack API: users.info](https://api.slack.com/methods/users.info)
- [Monday.com API: Person Column](https://developer.monday.com/api-reference/docs/person-columns)
- [Application README](../README.md)
- [Installation Guide](../INSTALLATION_GUIDE.md)
