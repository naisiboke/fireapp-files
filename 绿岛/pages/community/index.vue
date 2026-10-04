<template>
  <view class="community-view">

    <!-- 头 -->
    <view class="community-head">
      <view class="head-text">
        <text class="head-h1">FIRE 人生样本</text>
        <text class="head-sub">看别人怎么走过来的，也分享你自己的路</text>
      </view>
      <view class="fav-entry" @tap="openFavorites">
        <text class="fav-entry-text">我的收藏{{ favorites.length ? ' · ' + favorites.length : '' }}</text>
      </view>
    </view>

    <!-- 演示开关 -->
    <view class="debug-row">
      <text class="debug-label">演示开关</text>
      <view class="debug-btn" :class="{ active: isMember }" @tap="isMember = !isMember">
        <text class="debug-text" :class="{ active: isMember }">{{ isMember ? '会员' : '非会员' }}</text>
      </view>
      <view class="debug-btn" :class="{ active: hasUGC }" @tap="hasUGC = !hasUGC">
        <text class="debug-text" :class="{ active: hasUGC }">{{ hasUGC ? '有 UGC' : '无 UGC' }}</text>
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'settled' }" @tap="setTab('settled')">
        <text class="tab-text" :class="{ active: tab === 'settled' }">已上岸 7</text>
      </view>
      <view class="tab" :class="{ active: tab === 'doing' }" @tap="setTab('doing')">
        <text class="tab-text" :class="{ active: tab === 'doing' }">在路上 {{ hasUGC ? allUGC.length : 0 }}</text>
      </view>
    </view>

    <!-- 列表 -->
    <view class="list">
      <view v-if="visiblePosts.length === 0" class="empty">
        <text class="empty-h2">还没有人在路上分享</text>
        <text class="empty-p">成为第一个写下自己故事的人吧</text>
      </view>

      <view v-for="(post, i) in visiblePosts" :key="post.id" class="card" :style="{ animationDelay: (i * 40) + 'ms' }">
        <view class="card-head">
          <text class="tag">{{ post.category }}</text>
          <view class="heart" @tap="toggleFavorite(post)">
            <text class="heart-icon" :class="{ saved: isFav(post.id) }">{{ isFav(post.id) ? '♥' : '♡' }}</text>
          </view>
        </view>

        <view class="card-main" @tap="toggleExpand(post.id)">
          <text class="card-title">{{ post.title }}</text>
          <text class="card-summary">{{ post.summary }}</text>
          <text v-if="post.sub" class="card-sub">{{ post.sub }}</text>
        </view>

        <view v-if="expanded[post.id]" class="card-expanded">
          <view class="timeline">
            <view v-for="(row, idx) in post.timeline" :key="idx" class="timeline-row">
              <view class="timeline-mark" :class="{ last: idx === post.timeline.length - 1 }">
                <view class="mark-dot" :class="{ last: idx === post.timeline.length - 1 }"></view>
                <view v-if="idx < post.timeline.length - 1" class="mark-line"></view>
              </view>
              <view class="timeline-text-wrap">
                <text class="timeline-year">{{ row.year || row }}</text>
                <text class="timeline-desc">{{ row.desc || '' }}</text>
              </view>
            </view>
          </view>

          <template v-if="isOfficial(post)">
            <view v-if="isMember" class="detail">
              <text class="section-title">关键转折</text>
              <view class="turn"><text class="turn-text">{{ post.turn }}</text></view>

              <view class="metrics">
                <view class="metric">
                  <text class="metric-num">{{ post.metrics[0] }}</text>
                  <text class="metric-label">历史年化</text>
                </view>
                <view class="metric">
                  <text class="metric-num">{{ post.metrics[1] }}</text>
                  <text class="metric-label">最大回撤</text>
                </view>
                <view class="metric">
                  <text class="metric-num">{{ post.metrics[2] }}</text>
                  <text class="metric-label">波动率</text>
                </view>
              </view>

              <text class="section-title">资产配置</text>
              <view class="allocation">
                <view v-for="(a, k) in post.allocation" :key="k" class="alloc-row">
                  <view class="alloc-head">
                    <text class="alloc-name">{{ a[0] }}</text>
                    <text class="alloc-pct">{{ a[1] }}%</text>
                  </view>
                  <view class="alloc-bar">
                    <view class="alloc-fill" :style="{ width: a[1] + '%' }"></view>
                  </view>
                </view>
              </view>

              <view class="apply-btn" @tap="openApply(post)">
                <text class="apply-btn-text">套用他的资产配置 ›</text>
              </view>
            </view>

            <view v-else class="locked">
              <view class="locked-blur">
                <text class="section-title">关键转折</text>
                <view class="turn"><text class="turn-text">{{ post.turn }}</text></view>
                <view class="metrics">
                  <view class="metric">
                    <text class="metric-num">{{ post.metrics[0] }}</text>
                    <text class="metric-label">历史年化</text>
                  </view>
                  <view class="metric">
                    <text class="metric-num">{{ post.metrics[1] }}</text>
                    <text class="metric-label">最大回撤</text>
                  </view>
                  <view class="metric">
                    <text class="metric-num">{{ post.metrics[2] }}</text>
                    <text class="metric-label">波动率</text>
                  </view>
                </view>
              </view>
              <view class="locked-mask">
                <view class="lock-btn" @tap="openUpgrade">
                  <text class="lock-btn-text">升级会员，查看他的关键转折与资产配置</text>
                  <text class="lock-btn-sub">会员专享</text>
                </view>
              </view>
            </view>
          </template>

          <view v-else class="ugc-story">
            <text class="ugc-story-text">{{ post.content || post.summary }}</text>
          </view>
        </view>

        <view class="card-foot" @tap="toggleExpand(post.id)">
          <text class="foot-text">
            {{ isOfficial(post)
              ? (expanded[post.id] ? '收起他的 FIRE 历程' : '查看他的 FIRE 历程')
              : ('来自「' + (post.displayName || '匿名') + '」') }}
          </text>
          <text class="foot-arrow">{{ expanded[post.id] ? '⌃' : '⌄' }}</text>
        </view>
      </view>

      <view v-if="visiblePosts.length > 0 && visiblePosts.length < allPosts.length" class="load-more" @tap="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
      <text v-else-if="visiblePosts.length > 0 && allPosts.length > 0" class="no-more">没有更多了</text>
    </view>

    <!-- FAB -->
    <view class="fab" @tap="openPost">
      <text class="fab-icon">＋</text>
    </view>

    <!-- 弹窗：升级会员 -->
    <view v-if="modal === 'upgrade'" class="backdrop" @tap="closeModal">
      <view class="modal" @tap.stop>
        <view class="modal-head">
          <text class="modal-h2">升级会员</text>
          <view class="modal-close" @tap="closeModal"><text class="close-icon">×</text></view>
        </view>
        <text class="modal-p">完整查看关键转折、资产配比，并套用适合你的配置。</text>
        <view class="btn" @tap="closeModal"><text class="btn-text">知道了</text></view>
      </view>
    </view>

    <!-- 弹窗：我的收藏 -->
    <view v-if="modal === 'favorites'" class="backdrop" @tap="closeModal">
      <view class="modal" @tap.stop>
        <view class="modal-head">
          <text class="modal-h2">我的收藏</text>
          <view class="modal-close" @tap="closeModal"><text class="close-icon">×</text></view>
        </view>

        <view v-if="favorites.length === 0" class="empty-fav">
          <text class="empty-fav-text">还没有收藏内容</text>
        </view>

        <view v-else class="fav-list">
          <view v-for="f in favorites" :key="f.postId" class="fav-item">
            <view class="fav-row">
              <view class="fav-main" @tap="toggleFavExpand(f.postId)">
                <text class="fav-title">{{ f.snapshot.title }}</text>
                <text class="fav-sub">{{ f.snapshot.summary }}</text>
              </view>
              <view class="fav-remove" @tap="removeFavorite(f.postId)">
                <text class="fav-remove-icon">×</text>
              </view>
            </view>
            <view v-if="favExpanded[f.postId]" class="fav-expanded">
              <view class="timeline">
                <view v-for="(row, idx) in (f.snapshot.timeline || [])" :key="idx" class="timeline-row">
                  <view class="timeline-mark" :class="{ last: idx === (f.snapshot.timeline || []).length - 1 }">
                    <view class="mark-dot" :class="{ last: idx === (f.snapshot.timeline || []).length - 1 }"></view>
                    <view v-if="idx < (f.snapshot.timeline || []).length - 1" class="mark-line"></view>
                  </view>
                  <view class="timeline-text-wrap">
                    <text class="timeline-year">{{ row.year || row }}</text>
                    <text class="timeline-desc">{{ row.desc || '' }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 弹窗：套用配置 -->
    <view v-if="modal === 'apply'" class="backdrop" @tap="closeModal">
      <view class="modal" @tap.stop>
        <view class="modal-head">
          <text class="modal-h2">他的资产配置</text>
          <view class="modal-close" @tap="closeModal"><text class="close-icon">×</text></view>
        </view>

        <template v-if="applyPost">
          <view class="hero">
            <text class="hero-kicker">{{ applyPost.category }}</text>
            <text class="hero-title">{{ applyPost.title }}</text>
            <text class="hero-sub">来自 FIRE 人生样本</text>
          </view>

          <template v-if="applyResult">
            <view class="apply-result">
              <text class="apply-line">当前净资产：¥ {{ formatNumber(applyResult.netWorth) }}</text>
              <text v-for="(a, k) in applyResult.allocations" :key="k" class="apply-line">
                {{ a.name }}：¥ {{ formatNumber(a.amount) }}
              </text>
              <text class="apply-line">预计每年收益：¥ {{ formatNumber(applyResult.annual) }}</text>
              <text class="apply-saved">已保存为你的第 {{ applyResult.index }} 套配置</text>
            </view>
            <view class="btn light" @tap="undoApply"><text class="btn-text">撤销本次应用</text></view>
          </template>

          <template v-else-if="netWorth !== null">
            <text class="apply-net">当前净资产：¥ {{ formatNumber(netWorth) }}</text>

            <view class="metrics">
              <view class="metric">
                <text class="metric-num">{{ applyPost.metrics[0] }}</text>
                <text class="metric-label">历史年化</text>
              </view>
              <view class="metric">
                <text class="metric-num">{{ applyPost.metrics[1] }}</text>
                <text class="metric-label">最大回撤</text>
              </view>
              <view class="metric">
                <text class="metric-num">{{ applyPost.metrics[2] }}</text>
                <text class="metric-label">波动率</text>
              </view>
            </view>

            <view class="allocation">
              <view v-for="(a, k) in applyPost.allocation" :key="k" class="alloc-row">
                <view class="alloc-head">
                  <text class="alloc-name">{{ a[0] }}</text>
                  <text class="alloc-pct">{{ a[1] }}%</text>
                </view>
                <view class="alloc-bar">
                  <view class="alloc-fill" :style="{ width: a[1] + '%' }"></view>
                </view>
              </view>
            </view>

            <view class="btn" @tap="confirmApply"><text class="btn-text">应用到我的资产</text></view>
          </template>

          <template v-else>
            <text class="modal-p">先填写你当前的净资产，我们用它计算配置金额。</text>
            <view class="form-row">
              <text class="form-label">当前净资产（元）</text>
              <input class="form-input" type="number" v-model="netWorthInput" placeholder="例如 500000" />
            </view>
            <view class="btn" @tap="submitNetWorth"><text class="btn-text">继续</text></view>
          </template>

          <view class="btn light" style="margin-top: 10px;" @tap="closeModal">
            <text class="btn-text">取消</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 弹窗：发帖 -->
    <view v-if="modal === 'post'" class="post-backdrop">
      <view class="post-modal">
        <view class="post-head">
          <text class="post-h2">分享我的经历</text>
          <view class="post-close" @tap="closePost"><text class="close-icon">✕</text></view>
        </view>

        <scroll-view scroll-y class="post-scroll">
          <view class="post-block">
            <text class="post-label">选几个标签</text>
            <view class="post-tags">
              <view v-for="tag in POST_TAGS" :key="tag" class="post-tag" :class="{ active: postDraft.tags.includes(tag) }" @tap="togglePostTag(tag)">
                <text class="post-tag-text" :class="{ active: postDraft.tags.includes(tag) }">{{ tag }}</text>
              </view>
            </view>
          </view>

          <view class="post-block">
            <text class="post-label">主题</text>
            <input class="post-input" v-model="postDraft.title" maxlength="80" placeholder="用一句话概括你的经历" />
          </view>

          <view class="post-block">
            <text class="post-label">简介</text>
            <view class="post-textarea-wrap">
              <textarea class="post-textarea" v-model="postDraft.content" maxlength="300" placeholder="简单写下这段经历的背景和现在的状态……" />
              <text class="post-counter">{{ postDraft.content.length }} / 300</text>
            </view>
          </view>

          <view class="post-block">
            <text class="post-label">时间点</text>
            <view v-for="(row, i) in postDraft.timeline" :key="i" class="post-tl-row">
              <input class="pt-year" v-model="row.year" type="number" maxlength="4" placeholder="年份" />
              <input class="pt-title" v-model="row.title" maxlength="60" placeholder="事件描述" />
              <view class="pt-remove" @tap="removeTimelineRow(i)"><text class="pt-remove-icon">×</text></view>
            </view>
            <view class="post-add" @tap="addTimelineRow"><text class="post-add-text">＋ 添加时间点</text></view>
          </view>

          <view v-if="postReady" class="post-preview">
            <text class="post-label">预览</text>
            <view class="timeline">
              <view v-for="(row, idx) in validTimeline" :key="idx" class="timeline-row">
                <view class="timeline-mark" :class="{ last: idx === validTimeline.length - 1 }">
                  <view class="mark-dot" :class="{ last: idx === validTimeline.length - 1 }"></view>
                  <view v-if="idx < validTimeline.length - 1" class="mark-line"></view>
                </view>
                <view class="timeline-text-wrap">
                  <text class="timeline-year">{{ row.year }}</text>
                  <text class="timeline-desc">{{ row.title }}</text>
                </view>
              </view>
            </view>
            <text class="preview-title">{{ postDraft.title }}</text>
            <text class="preview-body">{{ postDraft.content }}</text>
          </view>
        </scroll-view>

        <view class="post-foot">
          <view class="post-actions">
            <view class="post-draft-btn" @tap="saveDraft">
              <text class="post-draft-text">保存草稿</text>
            </view>
            <view class="post-submit" :class="{ disabled: !postReady }" @tap="submitPost">
              <text class="post-submit-text">发布</text>
            </view>
          </view>
          <text class="post-hint">发布后会经过审核，通过后展示</text>
        </view>
      </view>
    </view>

    <BottomTabs current="community" />
  </view>
</template>

<script>
import { COMMUNITY_OFFICIAL, COMMUNITY_UGC_SEED, COMMUNITY_POST_TAGS } from '@/utils/community-data.js'
import { CS } from '@/utils/community-store.js'
import BottomTabs from '@/components/BottomTabs.vue'

const EMPTY_DRAFT = () => ({
  tags: [],
  title: '',
  content: '',
  timeline: [{ year: '', title: '' }],
})

export default {
  components: { BottomTabs },

  data() {
    return {
      POST_TAGS: COMMUNITY_POST_TAGS,
      isMember: false,
      hasUGC: true,
      tab: 'settled',
      expanded: {},
      favExpanded: {},
      favorites: [],
      allUGC: [],
      modal: null,
      applyPost: null,
      applyResult: null,
      netWorth: null,
      netWorthInput: '',
      postDraft: EMPTY_DRAFT(),
      communityLoaded: 10,
    }
  },

  computed: {
    allPosts() {
      return this.tab === 'settled'
        ? COMMUNITY_OFFICIAL
        : (this.hasUGC ? this.allUGC : [])
    },
    visiblePosts() {
      return this.allPosts.slice(0, this.communityLoaded)
    },
    postReady() {
      const d = this.postDraft
      return d.tags.length > 0
        && d.title.trim().length > 0
        && d.content.trim().length > 0
        && this.validTimeline.length > 0
    },
    validTimeline() {
      return this.postDraft.timeline.filter(x => String(x.year).trim() && String(x.title).trim())
    },
  },

  onLoad() {
    this.favorites = CS.favorites()
    this.allUGC = this.buildUGCList()
    this.netWorth = CS.netWorth()
    const d = CS.draft()
    if (d) this.postDraft = { ...EMPTY_DRAFT(), ...d, timeline: (d.timeline && d.timeline.length) ? d.timeline : [{ year: '', title: '' }] }
  },

  methods: {
    buildUGCList() {
      const seed = COMMUNITY_UGC_SEED.map(x => ({ ...x }))
      const local = CS.ugc().map(x => ({
        ...x,
        category: (x.tags || []).join(' · ') || '在路上',
        summary: x.summary || (x.content ? x.content.slice(0, 100) : ''),
      }))
      return [...seed, ...local]
        .filter(x => x.status === 'approved')
        .sort((a, b) => b.createdAt - a.createdAt)
    },

    isOfficial(post) {
      return !!post.turn
    },

    setTab(t) {
      this.tab = t
      this.communityLoaded = 10
      uni.pageScrollTo({ scrollTop: 0, duration: 0 })
    },

    toggleExpand(id) {
      this.expanded = { ...this.expanded, [id]: !this.expanded[id] }
    },

    loadMore() {
      this.communityLoaded += 10
    },

    isFav(id) {
      return this.favorites.some(x => x.postId === id)
    },

    toggleFavorite(post) {
      const list = [...this.favorites]
      const idx = list.findIndex(x => x.postId === post.id)
      if (idx >= 0) {
        list.splice(idx, 1)
        uni.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        list.push({
          postId: post.id,
          snapshotAt: Date.now(),
          snapshot: {
            id: post.id,
            category: post.category,
            title: post.title,
            summary: post.summary,
            sub: post.sub || '',
            timeline: post.timeline,
            content: post.content || '',
            displayName: post.displayName || '',
          },
        })
        uni.showToast({ title: '已收藏', icon: 'none' })
      }
      this.favorites = list
      CS.saveFavorites(list)
    },

    removeFavorite(id) {
      this.favorites = this.favorites.filter(x => x.postId !== id)
      CS.saveFavorites(this.favorites)
    },

    toggleFavExpand(id) {
      this.favExpanded = { ...this.favExpanded, [id]: !this.favExpanded[id] }
    },

    closeModal() {
      this.modal = null
      this.applyPost = null
      this.applyResult = null
      this.netWorthInput = ''
    },

    openUpgrade() {
      this.modal = 'upgrade'
    },

    openFavorites() {
      this.favorites = CS.favorites()
      this.modal = 'favorites'
    },

    openApply(post) {
      this.applyPost = post
      this.applyResult = null
      this.netWorth = CS.netWorth()
      this.netWorthInput = this.netWorth ? String(this.netWorth) : ''
      this.modal = 'apply'
    },

    submitNetWorth() {
      const n = Number(this.netWorthInput)
      if (!Number.isFinite(n) || n <= 0) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }
      CS.setNetWorth(n)
      this.netWorth = n
    },

    confirmApply() {
      const c = this.applyPost
      const net = this.netWorth
      if (!c || !net) return
      const list = CS.applied()
      const allocations = c.allocation.map(x => ({
        name: x[0],
        percent: x[1],
        amount: Math.round(net * x[1] / 100),
      }))
      const record = {
        modelId: c.id,
        modelName: c.category + ' · ' + c.title,
        appliedAt: Date.now(),
        netWorth: net,
        allocations,
      }
      const idx = list.findIndex(x => x.modelId === c.id)
      if (idx < 0 && list.length >= 5) {
        uni.showToast({ title: '最多保存 5 套配置', icon: 'none' })
        return
      }
      if (idx >= 0) list[idx] = record
      else list.push(record)
      CS.saveApplied(list)
      this.applyResult = {
        ...record,
        index: idx >= 0 ? idx + 1 : list.length,
        annual: Math.round(net * parseFloat(c.metrics[0]) / 100),
      }
    },

    undoApply() {
      const list = CS.applied().filter(x => x.modelId !== this.applyPost.id)
      CS.saveApplied(list)
      this.applyResult = null
      uni.showToast({ title: '已撤销', icon: 'none' })
    },

    openPost() {
      const d = CS.draft()
      this.postDraft = d
        ? { ...EMPTY_DRAFT(), ...d, timeline: (d.timeline && d.timeline.length) ? d.timeline : [{ year: '', title: '' }] }
        : EMPTY_DRAFT()
      this.modal = 'post'
    },

    closePost() {
      CS.saveDraft(this.postDraft)
      this.modal = null
    },

    togglePostTag(tag) {
      const tags = [...this.postDraft.tags]
      const idx = tags.indexOf(tag)
      if (idx >= 0) tags.splice(idx, 1)
      else tags.push(tag)
      this.postDraft = { ...this.postDraft, tags }
    },

    addTimelineRow() {
      this.postDraft = {
        ...this.postDraft,
        timeline: [...this.postDraft.timeline, { year: '', title: '' }],
      }
    },

    removeTimelineRow(i) {
      if (this.postDraft.timeline.length <= 1) return
      const tl = [...this.postDraft.timeline]
      tl.splice(i, 1)
      this.postDraft = { ...this.postDraft, timeline: tl }
    },

    saveDraft() {
      CS.saveDraft(this.postDraft)
      uni.showToast({ title: '草稿已保存', icon: 'none' })
    },

    submitPost() {
      if (!this.postReady) {
        uni.showToast({ title: '请填写完整', icon: 'none' })
        return
      }
      const post = {
        id: 'ugc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        category: this.postDraft.tags.join(' · '),
        tags: [...this.postDraft.tags],
        title: this.postDraft.title.trim(),
        summary: this.postDraft.content.trim().slice(0, 100),
        content: this.postDraft.content.trim(),
        timeline: this.validTimeline.map(x => ({ year: x.year, desc: x.title })),
        displayName: '3263***',
        createdAt: Date.now(),
        status: 'pending',
      }
      const list = CS.ugc()
      list.unshift(post)
      if (!CS.saveUGC(list)) {
        uni.showToast({ title: '保存失败', icon: 'none' })
        return
      }
      CS.clearDraft()
      this.postDraft = EMPTY_DRAFT()
      this.modal = null
      uni.showToast({ title: '已提交，审核通过后展示', icon: 'none' })
    },

    formatNumber(n) {
      return Number(n).toLocaleString('zh-CN')
    },
  },
}
</script>

<style>
.community-view {
  min-height: 100vh;
  background: #e8efe4;
  padding: 24px 16px 160px;
  color: #243830;
  box-sizing: border-box;
}

/* 头 */
.community-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0 16px;
}
.head-text { min-width: 0; flex: 1; }
.head-h1 { display: block; font-size: 24px; font-weight: 700; color: #243830; letter-spacing: 0.5px; }
.head-sub { display: block; font-size: 13px; color: #64748b; margin-top: 6px; }
.fav-entry {
  padding: 8px 12px;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 3px 12px rgba(36,56,48,0.07);
  flex-shrink: 0;
}
.fav-entry-text { font-size: 13px; color: #243830; white-space: nowrap; }

/* 演示开关 */
.debug-row { display: flex; gap: 8px; align-items: center; padding: 8px 0 12px; flex-wrap: wrap; }
.debug-label { font-size: 12px; color: #64748b; }
.debug-btn { padding: 6px 12px; border-radius: 999px; border: 1px solid #dce4d7; background: #f7f9f4; }
.debug-btn.active { background: #243830; border-color: #243830; }
.debug-text { font-size: 12px; color: #52605a; }
.debug-text.active { color: #fff; }

/* Tab */
.tabs { display: flex; gap: 6px; padding: 6px; border-radius: 12px; background: #dde7d8; margin-bottom: 16px; }
.tab { flex: 1; padding: 12px 8px; border-radius: 9px; text-align: center; }
.tab.active { background: #ffffff; box-shadow: 0 2px 9px rgba(36,56,48,0.07); }
.tab-text { font-size: 14px; color: #52605a; }
.tab-text.active { color: #243830; font-weight: 600; }

/* 列表 */
.list { display: flex; flex-direction: column; gap: 12px; }
.card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(36,56,48,0.07);
  overflow: hidden;
  animation: card-in 0.35s ease both;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 0; }
.tag { font-size: 12px; padding: 4px 8px; border-radius: 6px; background: #eff3eb; color: #52605a; }
.heart { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.heart-icon { font-size: 20px; color: #66736a; line-height: 1; }
.heart-icon.saved { color: #e25562; }

.card-main { padding: 16px; }
.card-title { display: block; font-size: 18px; font-weight: 600; color: #243830; line-height: 1.4; }
.card-summary { display: block; font-size: 13px; color: #52605a; line-height: 1.7; margin-top: 8px; }
.card-sub { display: block; font-size: 13px; color: #52605a; line-height: 1.7; margin-top: 6px; }

.card-expanded { padding: 0 16px 16px; animation: expand-in 0.28s ease both; }
@keyframes expand-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-foot {
  border-top: 1px solid #e5e9e0;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.foot-text { font-size: 13px; color: #52605a; }
.foot-arrow { font-size: 18px; color: #527059; }

/* 时间线 */
.timeline { display: flex; flex-direction: column; }
.timeline-row { display: flex; gap: 10px; min-height: 48px; }
.timeline-mark { position: relative; width: 17px; display: flex; justify-content: center; flex-shrink: 0; }
.mark-dot { width: 8px; height: 8px; border-radius: 50%; background: #c8d2c1; margin-top: 6px; z-index: 1; }
.mark-dot.last { background: #527059; }
.mark-line { position: absolute; top: 14px; bottom: 0; width: 1px; background: #e5e9e0; }
.timeline-text-wrap { flex: 1; padding-bottom: 10px; }
.timeline-year { display: inline-block; font-size: 13px; font-weight: 600; color: #243830; margin-right: 6px; }
.timeline-desc { display: inline; font-size: 13px; color: #426052; line-height: 1.55; }

/* 详情 */
.section-title { display: block; font-size: 14px; font-weight: 600; color: #243830; margin: 14px 0 8px; }
.turn { padding: 12px; border-radius: 10px; background: #eff3eb; }
.turn-text { font-size: 13px; color: #426052; line-height: 1.7; }

.metrics { display: flex; gap: 7px; margin: 10px 0; }
.metric { flex: 1; padding: 10px 4px; border-radius: 10px; background: #f7f9f4; text-align: center; }
.metric-num { display: block; font-size: 16px; font-weight: 600; color: #243830; }
.metric-label { display: block; font-size: 11px; color: #52605a; margin-top: 4px; }

.allocation { display: flex; flex-direction: column; gap: 10px; }
.alloc-row { display: flex; flex-direction: column; gap: 6px; }
.alloc-head { display: flex; justify-content: space-between; font-size: 12px; color: #426052; }
.alloc-name { color: #426052; }
.alloc-pct { color: #243830; font-weight: 600; }
.alloc-bar { height: 6px; background: #e5e9e0; border-radius: 3px; overflow: hidden; }
.alloc-fill { height: 100%; background: #243830; border-radius: 3px; transition: width 0.4s ease; }

.apply-btn { width: 100%; margin-top: 16px; padding: 12px; border-radius: 10px; background: linear-gradient(135deg, #243830, #527059); display: flex; justify-content: center; align-items: center; }
.apply-btn-text { color: #ffffff; font-size: 13px; font-weight: 500; }

/* 锁定态 */
.locked { position: relative; margin-top: 10px; border-radius: 10px; overflow: hidden; }
.locked-blur { filter: blur(6px); padding: 0; user-select: none; }
.locked-mask {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 60px 8px 8px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  background: linear-gradient(to bottom, rgba(255,255,255,0), #fff 70%);
}
.lock-btn { width: 100%; padding: 12px 8px; border-radius: 10px; background: #ffffff; box-shadow: 0 -3px 13px #ffffff; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.lock-btn-text { font-size: 13px; color: #52605a; text-align: center; }
.lock-btn-sub { font-size: 11px; color: #66736a; }

/* UGC 正文 */
.ugc-story { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e9e0; }
.ugc-story-text { font-size: 13px; color: #426052; line-height: 1.75; white-space: pre-wrap; }

/* 加载更多 */
.load-more { margin: 16px auto 0; padding: 10px 18px; border: 1px solid #c8d2c1; border-radius: 10px; background: #ffffff; }
.load-more-text { font-size: 13px; color: #243830; }
.no-more { display: block; text-align: center; font-size: 12px; color: #83908b; padding: 20px 0; }

/* 空态 */
.empty { padding: 64px 16px; text-align: center; }
.empty-h2 { display: block; font-size: 18px; font-weight: 600; color: #243830; margin-bottom: 8px; }
.empty-p { display: block; font-size: 13px; color: #52605a; margin-bottom: 20px; }
.empty-btn { display: inline-block; padding: 12px 20px; border-radius: 10px; background: #243830; }
.empty-btn-text { color: #ffffff; font-size: 14px; }

/* FAB */
.fab {
  position: fixed;
  right: 20px;
  bottom: calc(120px + env(safe-area-inset-bottom));
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background: #243830;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 7px 20px rgba(36,56,48,0.25);
  z-index: 8;
}
.fab-icon { color: #ffffff; font-size: 32px; font-weight: 300; line-height: 1; margin-top: -4px; }

/* 弹窗 */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(36,56,48,0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
}
.modal {
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(36,56,48,0.27);
}
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-h2 { font-size: 19px; font-weight: 600; color: #243830; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; background: #f2f6ee; display: flex; align-items: center; justify-content: center; }
.close-icon { font-size: 20px; color: #52605a; line-height: 1; }
.modal-p { display: block; font-size: 13px; color: #52605a; line-height: 1.7; margin-bottom: 16px; }

.btn { display: flex; justify-content: center; align-items: center; min-height: 48px; padding: 12px; border-radius: 10px; background: #243830; }
.btn.light { background: #eef2e8; }
.btn-text { font-size: 14px; font-weight: 500; color: #ffffff; }
.btn.light .btn-text { color: #243830; }

/* 我的收藏 */
.empty-fav { padding: 40px 20px; text-align: center; }
.empty-fav-text { font-size: 13px; color: #52605a; }
.fav-list { display: flex; flex-direction: column; gap: 8px; }
.fav-item { display: flex; flex-direction: column; }
.fav-row { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f7f9f4; border-radius: 10px; }
.fav-main { flex: 1; min-width: 0; }
.fav-title { display: block; font-size: 14px; font-weight: 500; color: #243830; }
.fav-sub { display: block; font-size: 12px; color: #52605a; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fav-remove { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fav-remove-icon { font-size: 20px; color: #e25562; line-height: 1; }
.fav-expanded { padding: 8px 12px 12px; }

/* 套用配置 */
.hero { padding: 16px; border-radius: 12px; background: linear-gradient(135deg, #243830, #527059); margin-bottom: 16px; }
.hero-kicker { display: block; font-size: 11px; color: rgba(255,255,255,0.75); letter-spacing: 1px; }
.hero-title { display: block; font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 8px; }
.hero-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 4px; }

.apply-net { display: block; font-size: 14px; color: #243830; padding: 12px; background: #f7f9f4; border-radius: 10px; margin-bottom: 12px; }
.apply-result { padding: 14px; background: #eff3eb; border-radius: 10px; margin-bottom: 12px; }
.apply-line { display: block; font-size: 13px; color: #426052; line-height: 1.9; }
.apply-saved { display: block; font-size: 12px; color: #527059; margin-top: 8px; font-weight: 600; }

.form-row { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; color: #52605a; margin-bottom: 8px; }
.form-input {
  width: 100%;
  padding: 12px;
  background: #f7f9f4;
  border: 1px solid #e5e9e0;
  border-radius: 10px;
  font-size: 16px;
  color: #243830;
  box-sizing: border-box;
}

/* 发帖弹窗 */
.post-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(36,56,48,0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.post-modal {
  width: 100%;
  height: 95vh;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.post-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8efe4;
  flex-shrink: 0;
}
.post-h2 { font-size: 17px; font-weight: 600; color: #243830; }
.post-close { width: 36px; height: 36px; border-radius: 50%; background: #f2f6ee; display: flex; align-items: center; justify-content: center; }

.post-scroll { flex: 1; min-height: 0; padding: 20px; }

.post-block { margin-bottom: 24px; }
.post-label { display: block; font-size: 12px; font-weight: 500; color: #52605a; margin-bottom: 10px; }

.post-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.post-tag { padding: 10px 14px; border-radius: 10px; background: #eff3eb; border: 1.5px solid transparent; }
.post-tag.active { background: #e8efe4; border-color: #243830; }
.post-tag-text { font-size: 13px; color: #52605a; }
.post-tag-text.active { color: #243830; font-weight: 500; }

.post-input {
  width: 100%;
  padding: 12px;
  background: #f7f9f4;
  border: 1px solid #e5e9e0;
  border-radius: 10px;
  font-size: 15px;
  color: #243830;
  box-sizing: border-box;
}

.post-textarea-wrap { position: relative; }
.post-textarea {
  width: 100%;
  min-height: 140px;
  padding: 12px 12px 32px;
  background: #f7f9f4;
  border: 1px solid #e5e9e0;
  border-radius: 10px;
  font-size: 14px;
  color: #243830;
  box-sizing: border-box;
}
.post-counter { position: absolute; right: 12px; bottom: 10px; font-size: 11px; color: #66736a; }

.post-tl-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid #e5e9e0;
  border-radius: 10px;
  background: #f7f9f4;
  margin-bottom: 8px;
}
.pt-year { width: 80px; padding: 8px; border: 1px solid #e5e9e0; border-radius: 6px; background: #ffffff; font-size: 13px; color: #243830; }
.pt-title { flex: 1; padding: 8px; border: 1px solid #e5e9e0; border-radius: 6px; background: #ffffff; font-size: 13px; color: #243830; }
.pt-remove { width: 30px; height: 30px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pt-remove-icon { font-size: 20px; color: #66736a; line-height: 1; }

.post-add {
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px dashed #b8c6b3;
  border-radius: 10px;
  background: #ffffff;
  display: inline-block;
}
.post-add-text { font-size: 13px; color: #243830; }

.post-preview {
  padding-top: 20px;
  border-top: 1px solid #e8efe4;
}
.preview-title { display: block; font-size: 16px; font-weight: 600; color: #243830; margin: 12px 0 8px; }
.preview-body { display: block; font-size: 13px; color: #426052; line-height: 1.75; white-space: pre-wrap; }

.post-foot {
  flex-shrink: 0;
  padding: 16px 20px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #e8efe4;
  background: #ffffff;
}
.post-actions { display: flex; gap: 10px; }
.post-draft-btn {
  flex: 1;
  height: 48px;
  border: 1px solid #dce4d7;
  border-radius: 10px;
  background: #f7f9f4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-draft-text { font-size: 14px; color: #243830; }
.post-submit {
  flex: 1;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #243830, #527059);
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-submit.disabled { opacity: 0.4; }
.post-submit-text { font-size: 14px; font-weight: 500; color: #ffffff; }
.post-hint {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #66736a;
  margin-top: 8px;
}
</style>