# Fix Docker ContainerConfig Error

This error happens when Docker Compose has stale container metadata. Here's how to fix it:

## Step 1: Stop and remove all containers

```bash
docker-compose down
```

## Step 2: Remove dangling images (optional but recommended)

```bash
docker system prune -f
```

## Step 3: Rebuild and start fresh

```bash
docker-compose up -d --build
```

## If that doesn't work, try a complete cleanup:

### Stop everything
```bash
docker-compose down -v
```

### Remove all stopped containers
```bash
docker container prune -f
```

### Remove unused images
```bash
docker image prune -a -f
```

### Rebuild from scratch
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Quick Alternative: Just rebuild frontend

If you only need to install the tooltip package and don't want to touch backend:

```bash
# Stop only frontend
docker-compose stop frontend

# Remove frontend container
docker-compose rm -f frontend

# Rebuild and start frontend
docker-compose up -d --build frontend
```

## Verify it's working

```bash
# Check running containers
docker-compose ps

# Check frontend logs
docker-compose logs -f frontend

# Verify tooltip package is installed
docker-compose exec frontend npm list @radix-ui/react-tooltip
```

## What caused this?

The error `KeyError: 'ContainerConfig'` usually happens when:
1. Docker images are corrupted or partially built
2. Docker Compose cache is stale
3. Containers were stopped improperly

The clean rebuild fixes all of these issues.


---

## ✅ TOOLTIP VISIBILITY FIX APPLIED

### Problem
Tooltips were being clipped/hidden by parent containers with `overflow-hidden` CSS property, even though they used Portal and high z-index.

### Solution
1. **Conditional overflow**: Changed parent containers to use `overflow-visible` when data table is active
2. **Increased z-index**: Changed table header from `z-10` to `z-[100]` for proper stacking
3. **Added relative positioning**: Added `relative` class to main content area for proper stacking context

### Changes Made

**Daily Tab** (`apps/frontend/src/app/(dashboard)/dashboard/daily/page.tsx`):
- Main content area: Added `relative` class
- Chart area container: Changed to conditional `overflow-visible` when `activeTab === 'data'`
- Chart content container: Changed to conditional `overflow-visible` when `activeTab === 'data'`
- Table header: Changed from `z-10` to `z-[100]`

**Weekly Tab** (`apps/frontend/src/app/(dashboard)/dashboard/weekly/page.tsx`):
- Main content area: Added `relative` class
- Chart area container: Changed to conditional `overflow-visible` when `activeTab === 'data'`
- Chart content container: Changed to conditional `overflow-visible` when `activeTab === 'data'`
- Table header: Changed from `z-10` to `z-[100]`

### How It Works
- **When viewing charts**: `overflow-hidden` prevents content from spilling outside containers
- **When viewing data tables**: `overflow-visible` allows tooltips to render above the table without clipping
- **Tooltips**: Use Portal (renders outside DOM hierarchy) + `z-[9999]` to appear above all content
- **Table headers**: Use `z-[100]` to stay above table rows when scrolling

### Status
✅ Tooltip visibility fixed in both daily and weekly tabs
✅ Tooltips now render above table content without being clipped
✅ No TypeScript errors
✅ Conditional overflow maintains proper layout for both chart and data views
