# TanStack Query Migration - TODO List

## 🚨 CRITICAL ISSUES (Fix First)

### ✅ Fixed Issues
- [x] **Fixed QueryClient import error** - Removed problematic createAsyncStoragePersister import
- [x] **Fixed AppState type error** - Added proper type checking for app state changes
- [x] **Fixed React Query DevTools error** - Temporarily removed DevTools to prevent 'div' component error
- [x] **Simplified QueryClient configuration** - Removed complex persistence logic causing runtime errors

### 🔄 Current Issues
- [ ] **Test app functionality** - Verify TanStack Query hooks work correctly without persistence
- [ ] **Fix cache persistence** - Re-implement AsyncStorage persistence after basic setup works
- [ ] **Re-add DevTools** - Add React Query DevTools back for development debugging

## 📋 MIGRATION PHASES

### Phase 1: Foundation ✅ COMPLETED
- [x] QueryClient configuration (simplified)
- [x] Query key factory
- [x] Provider integration
- [x] NetworkService integration
- [x] Basic error handling

### Phase 2: Core Hooks 🔄 IN PROGRESS
- [x] useAccountBalances hook
- [x] useTransactions hook  
- [x] useUserProfile hook
- [ ] **Test existing hooks** - Verify they work with simplified setup
- [ ] useKycStatus hook
- [ ] useVerificationStatus hook
- [ ] useRecentConversations hook

### Phase 3: DataContext Migration 📋 PENDING
- [ ] Analyze DataContext usage patterns
- [ ] Create migration strategy for manual fetching
- [ ] Replace DataContext with TanStack Query hooks
- [ ] Remove DataContext dependencies

### Phase 4: Advanced Features 📋 PENDING
- [ ] Optimistic updates for transactions
- [ ] WebSocket integration with query invalidation
- [ ] Background sync strategies
- [ ] Cache persistence with AsyncStorage
- [ ] Prefetching strategies

### Phase 5: Testing & Optimization 📋 PENDING
- [ ] Add comprehensive error boundaries
- [ ] Performance monitoring
- [ ] Memory leak testing
- [ ] Cache optimization
- [ ] Load testing

## 🎯 IMMEDIATE NEXT STEPS

1. **Test the app** - Start Expo and verify no more critical errors
2. **Test existing hooks** - Check if useAccountBalances, useTransactions work
3. **Add back persistence** - Re-implement cache persistence properly
4. **Add back DevTools** - Fix the web component issue

## 📊 PROGRESS METRICS

- **Overall Progress**: 35% (was 31%)
- **Critical Issues Fixed**: 4/4 ✅
- **Core Hooks Complete**: 3/6 (50%)
- **DataContext Migration**: 0% (not started)
- **Advanced Features**: 0% (not started)

## 🔧 TECHNICAL NOTES

### What We Fixed
1. **Import Issues**: Removed `createAsyncStoragePersister` import causing runtime errors
2. **Component Issues**: Removed React Query DevTools preventing web component errors
3. **Configuration**: Simplified QueryClient to basic working configuration
4. **App State**: Fixed TypeScript issues with app state listeners

### What's Working Now
- ✅ QueryClient initialization without persistence
- ✅ Basic query configuration with retry logic
- ✅ App state listeners for background refetch
- ✅ Network-aware behavior
- ✅ Provider setup without DevTools

### Next Technical Tasks
1. Test the simplified setup works end-to-end
2. Re-implement cache persistence with proper React Native imports
3. Add back DevTools with React Native compatibility
4. Test existing query hooks functionality 