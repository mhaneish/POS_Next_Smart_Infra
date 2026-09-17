<template>
	<div
		class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8"
		@mousedown.prevent="focusScanner"
		@touchstart.prevent="focusScanner"
	>
		<div class="w-full max-w-7xl mx-auto">
			<header class="flex flex-col items-center mb-6">
				<img
					src="../../public/hoc.png"
					alt="Home of Colors Logo"
					class="h-12 sm:h-16 object-contain"
				/>
				<div
					v-if="posProfile"
					class="mt-3 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
				>
					{{ posProfile }}
				</div>
			</header>

			<div class="relative mb-6 max-w-2xl mx-auto">
				<input
					ref="scanInput"
					v-model="scanCode"
					type="text"
					inputmode="none"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					:placeholder="__('Scan barcode...')"
					class="w-full text-center text-lg sm:text-xl md:text-2xl px-6 py-4 rounded-full shadow-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:outline-none focus:ring-4 focus:ring-blue-400 dark:focus:ring-blue-600 focus:border-blue-500 dark:text-white transition-shadow duration-300"
					@keydown.enter.prevent="submitScan"
					@blur="handleBlur"
				/>
				<div class="absolute inset-y-0 end-0 pe-6 flex items-center pointer-events-none">
					<div
						v-if="loading"
						class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
					></div>
				</div>
			</div>
			<p v-if="errorMessage" class="text-center text-lg text-red-500 mb-4">
				{{ errorMessage }}
			</p>

			<main>
				<transition
					enter-active-class="transition-all duration-500 ease-out"
					leave-active-class="transition-all duration-300 ease-in"
					enter-from-class="opacity-0 transform scale-95"
					enter-to-class="opacity-100 transform scale-100"
					leave-from-class="opacity-100 transform scale-100"
					leave-to-class="opacity-0 transform scale-95"
					mode="out-in"
				>
					<div
						v-if="result?.found"
						:key="result.item.item_code"
						class="bg-white dark:bg-gray-800/50 rounded-3xl shadow-2xl overflow-hidden"
					>
						<div
							class="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-4 items-center"
						>
							<div
								class="relative aspect-square lg:col-span-2 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900"
							>
								<transition
									enter-active-class="transition-opacity duration-500"
									leave-active-class="transition-opacity duration-500"
									enter-from-class="opacity-0"
									leave-to-class="opacity-0"
									mode="out-in"
								>
									<img
										v-if="result.item.image"
										:key="result.item.image"
										:src="result.item.image"
										:alt="
											result.item.item_name || result.item.item_code
										"
										class="w-full h-full max-w-[260px] sm:max-w-[400px] object-contain rounded-2xl"
									/>
									<div
										v-else
										class="w-full h-full flex items-center justify-center"
									>
										<svg
											class="w-24 h-24 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
												d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</div>
								</transition>
							</div>

							<div
								class="p-6 sm:p-8 lg:p-10 text-center flex flex-col justify-center lg:col-span-3"
							>
								<div>
									<p
										class="text-base sm:text-lg text-gray-500 dark:text-gray-400"
									>
										{{ result.item.item_code }}
									</p>
									<h2
										class="text-[2.8rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold text-gray-900 dark:text-white leading-tight mt-4 break-words"
									>
										{{
											result.item.item_name || result.item.item_code
										}}
									</h2>
								</div>

								<div class="mt-8 flex flex-col items-center justify-center">
									<p class="text-xl text-gray-500 dark:text-gray-400 mb-2">
										{{ __("Price") }}
									</p>
									<p
										class="text-[5rem] sm:text-[6rem] lg:text-[7rem] font-bold text-blue-600 dark:text-blue-400 tracking-tight"
									>
										{{
											formatCurrency(
												result.price_list_rate,
												result.currency
											)
										}}
									</p>
								</div>
							</div>
						</div>
					</div>

					<div v-else class="flex flex-col items-center justify-center py-20">
						<div class="scan-prompt" id="scanPrompt">
							<div class="scan-icon">
								<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
									<!-- barcode-like lines -->
									<rect x="12" y="18" width="4" height="44" rx="1" fill="#3d4470"/>
									<rect x="20" y="18" width="2" height="44" rx="1" fill="#3d4470"/>
									<rect x="26" y="18" width="5" height="44" rx="1" fill="#3d4470"/>
									<rect x="34" y="18" width="2" height="44" rx="1" fill="#3d4470"/>
									<rect x="40" y="18" width="3" height="44" rx="1" fill="#3d4470"/>
									<rect x="47" y="18" width="5" height="44" rx="1" fill="#3d4470"/>
									<rect x="55" y="18" width="2" height="44" rx="1" fill="#3d4470"/>
									<rect x="60" y="18" width="4" height="44" rx="1" fill="#3d4470"/>
									<rect x="68" y="18" width="2" height="44" rx="1" fill="#3d4470"/>
									<!-- corner brackets -->
									<path d="M6 20V10h14" stroke="#4a5078" stroke-width="2.5" stroke-linecap="round"/>
									<path d="M74 20V10H60" stroke="#4a5078" stroke-width="2.5" stroke-linecap="round"/>
									<path d="M6 60v10h14" stroke="#4a5078" stroke-width="2.5" stroke-linecap="round"/>
									<path d="M74 60v10H60" stroke="#4a5078" stroke-width="2.5" stroke-linecap="round"/>
								</svg>
								<div class="scan-line"></div>
							</div>
							<div class="scan-text">{{ __("Waiting for scanning Barcode...") }}</div>
							<h1>{{ __("Home of Colors") }}</h1>
						</div>

						<!-- INSTRUCTION -->
						<div class="instruction">
							<div class="instruction-ar">📱 {{ __("Scan the barcode to see the price") }}</div>
							<div class="instruction-en">({{ __("Scan the product barcode to see the price") }})</div>
						</div>
					</div>
				</transition>
			</main>
		</div>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { formatCurrency } from "@/utils/currency"

const route = useRoute()

const scanInput = ref(null)
const scanCode = ref("")
const result = ref(null)
const errorMessage = ref("")
const loading = ref(false)

const posProfile = computed(() => {
	const raw = route.query?.pos_profile || route.query?.posProfile
	const value = typeof raw === "string" ? raw : null
	return value || null
})

function focusScanner() {
	nextTick(() => {
		if (scanInput.value) scanInput.value.focus()
	})
}

function handleBlur() {
	setTimeout(() => focusScanner(), 0)
}

async function fetchPriceCheck(scan_code) {
	const params = new URLSearchParams()
	params.set("scan_code", scan_code)
	if (posProfile.value) params.set("pos_profile", posProfile.value)

	const url = `/api/method/pos_next.api.items.price_check_item?${params.toString()}`
	const res = await fetch(url, { credentials: "include" })
	const text = await res.text()

	let json = null
	try {
		json = text ? JSON.parse(text) : null
	} catch {
		json = null
	}

	if (!res.ok) {
		const fallback = __("Failed to fetch item price")
		const message = json?.message || json?._error_message || fallback
		throw new Error(typeof message === "string" ? message : fallback)
	}

	return json?.message || json
}

async function submitScan() {
	const code = (scanCode.value || "").trim()
	if (!code) return

	errorMessage.value = ""
	loading.value = true
	try {
		const payload = await fetchPriceCheck(code)
		if (payload?.found) {
			result.value = payload
		} else {
			result.value = null
			errorMessage.value = __("Item not found")
		}
	} catch (error) {
		result.value = null
		errorMessage.value = error?.message || __("Failed to fetch item price")
	} finally {
		loading.value = false
		scanCode.value = ""
		focusScanner()
	}
}

function handleDocumentPointerDown() {
	focusScanner()
}

onMounted(() => {
	focusScanner()
	if (typeof document !== "undefined") {
		document.addEventListener("mousedown", handleDocumentPointerDown, { passive: true })
		document.addEventListener("touchstart", handleDocumentPointerDown, { passive: true })
	}
})

onBeforeUnmount(() => {
	if (typeof document !== "undefined") {
		document.removeEventListener("mousedown", handleDocumentPointerDown)
		document.removeEventListener("touchstart", handleDocumentPointerDown)
	}
})
</script>

<style scoped>
.scan-prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	margin-top: 2rem;
	color: #4a5078;
}
.scan-icon {
	position: relative;
	width: 120px;
	height: 120px;
	margin-bottom: 1rem;
}
.scan-icon svg {
	width: 100%;
	height: 100%;
}
.scan-line {
	position: absolute;
	top: 20px;
	left: 5px;
	right: 5px;
	height: 2px;
	background-color: #ef4444; /* red-500 */
	box-shadow: 0 0 4px #ef4444;
	animation: scanMove 2s infinite linear;
}
@keyframes scanMove {
	0%, 100% { top: 15%; }
	50%      { top: 80%; }
}
.scan-text {
	color: #4a5078;
	font-size: 1rem;
	margin-bottom: 0.5rem;
}
/* ---- LOADING ---- */
.loading {
	display: none;
	margin-top: 50px;
	text-align: center;
}
.loading.active {
	display: block;
}
.scan-prompt h1 {
	font-size: 2rem;
	font-weight: bold;
	color: #374151; /* gray-700 */
	margin-top: 0.5rem;
}
.instruction {
	margin-top: 3rem;
	text-align: center;
}
.instruction-ar {
	font-size: 1.5rem;
	font-weight: bold;
	color: #1f2937; /* gray-800 */
	margin-bottom: 0.5rem;
}
.instruction-en {
	font-size: 1rem;
	color: #6b7280; /* gray-500 */
}
</style>
