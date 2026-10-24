<!-- version v1.0 -->
# Tối ưu thư viện và Neon Survivors

Phạm vi đã thống nhất ngày 24/10/2026:

1. Tải JavaScript/CSS theo game được chọn, giữ HTTP và mở trực tiếp `file://`.
2. Lưu vàng, nâng cấp, nhân vật và tùy chọn Neon trên thiết bị.
3. Giảm việc vẽ ngoài màn hình và tạo lại hiệu ứng phát sáng; thêm chất lượng đồ họa.
4. Giảm số phép kiểm tra va chạm và số lần ghi lại HUD.
5. Mô phỏng theo bước thời gian cố định, giới hạn bù thời gian và giảm vẽ màn tĩnh.
6. Cho phép cache có kiểm tra phiên bản trong chế độ máy chủ production.

Không thay đổi số quái, luật chơi hay độ khó để đạt kết quả hiệu năng.

## Cách đánh giá

- Lưu bản HTML/JavaScript ban đầu ở `test-results/optimization/` trước khi sửa.
- `tests/benchmark-optimization.cjs before|after` đo thư viện trong ba browser
  context mới, dùng server HTTP cục bộ với cache tắt cho cả hai bản.
- Cảnh Neon dùng cùng seed, 220 quái, 100 viên đạn, 300 ngọc và 100 đồng vàng;
  viewport 820×1180, DPR 2. Tắt âm thanh và tạo trạng thái trực tiếp trong test.
- Đo thời gian CPU cập nhật; đo vẽ Canvas kèm đọc một pixel để buộc hoàn thành
  tác vụ vẽ. Chi phí đọc pixel có trong kết quả, không quy đổi thành FPS chơi thật.
- Đếm thay đổi DOM khi HUD không đổi và số lần vẽ lại màn tạm dừng.
- Thời gian mở Neon qua automation có cả chi phí thao tác/chờ của Playwright.
  Bộ nhớ `performance.memory` chỉ ghi khi trình duyệt cung cấp; không phải toàn
  bộ bộ nhớ GPU hoặc tiến trình.

Chromium/Edge và WebKit chạy headless trên Windows với kích thước mô phỏng.
Không tạo máy ảo, không có phép đo pin/nhiệt độ hoặc kiểm thử trên iPad thật.
Số đo tổng hợp chỉ dùng so sánh cùng điều kiện; cần kiểm thử thiết bị thật để
kết luận độ mượt khi chơi dài trên từng dòng iPhone/iPad.

## Chạy benchmark

Đặt `PLAYWRIGHT_MODULE` và `PLAYWRIGHT_BROWSERS_PATH` như README nếu Playwright
cài riêng. Benchmark tự mở/đóng server loopback trên cổng trống.

```powershell
node tests/benchmark-optimization.cjs before
node tests/benchmark-optimization.cjs after
```

Lệnh `before` cần các snapshot `index-before.html`, `arcade-before.js`,
`art-before.js`, `royal-before.js`, `neon-before.html` trong
`test-results/optimization/`. Thư mục này không đưa
vào git. Lệnh `after` dùng mã nguồn hiện tại. Báo cáo JSON nằm cùng thư mục.

## Kết quả

Đã hoàn tất các mục trên. Chỉ số tài nguyên ban đầu:

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| JavaScript tải khi vào thư viện | 48 file | 3 file |
| CSS tải khi vào thư viện | 20 file | 2 file |
| Tổng JS/CSS, chưa nén | 952.019 byte | 160.877 byte |
| DOM mutation khi gọi HUD 120 lần với dữ liệu không đổi | 600 | 0 |
| Lần vẽ lại sau khi màn tạm dừng ổn định, trong 120 nhịp | 120 | 0 |

Dữ liệu JS/CSS ban đầu giảm **83,1%**. Đây là số byte của file được tham chiếu,
không phải dung lượng toàn bộ website, bộ nhớ đang dùng hay tốc độ mạng.

Trung vị ba context mới, server cục bộ không cache:

| Engine | Thư viện sẵn sàng trước → sau | Mở Neon qua automation trước → sau |
| --- | ---: | ---: |
| Chromium/Edge 155.0.4283.62 | 772,8 → 195,9 ms | 672,3 → 399,2 ms |
| WebKit 26.0 | 2.446 → 80 ms | 2.425 → 801 ms |

Bằng chứng: `benchmark-before.json` và `benchmark-after-final.json` trong
`test-results/optimization/`. Số mẫu nhỏ, thời gian có dao động do khởi động
trình duyệt và môi trường Windows; không dùng các tỷ lệ này làm cam kết tốc độ.

### Điều chỉnh cách vẽ sau phép đo

Thử nghiệm cache hình phát sáng bằng bitmap khiến phần vẽ chậm hơn trong
cảnh chuẩn. Bản cuối dùng vector trực tiếp, chỉ chuyển hệ tọa độ cho vật thể
cần xoay, bỏ qua vật thể ngoài khung nhìn. Không giữ cache bitmap không có lợi.

So bản gốc trong lượt đối chiếu bổ sung `benchmark-before-render-check.json`
với bản cuối `benchmark-after-final.json`, cùng cảnh và DPR 2/chất lượng Cao:

| Trung vị | Chromium trước → sau | WebKit trước → sau |
| --- | ---: | ---: |
| Cập nhật logic | 0,7 → 0,2 ms | khoảng 1 → dưới độ phân giải 1 ms |
| Gửi lệnh vẽ Canvas | 1,5 → 1,1 ms | 2 → 1 ms |
| Vẽ kèm đọc pixel đồng bộ | 27,8 → 26,6 ms | 53 → 61 ms |

Phép đọc pixel là thao tác kiểm thử, game không thực hiện mỗi frame. Kết quả
WebKit ở chỉ số này chưa cho thấy cải thiện; chưa thể khẳng định FPS hay pin
trên iPad từ phép đo này. Kết quả thử bitmap vẫn được giữ ở
`benchmark-after-render-check.json` để đối chiếu. Không quy đổi số đo dưới độ
phân giải đồng hồ thành chi phí bằng không.

## Triển khai và kiểm thử

- `games/loader.js` tải theo manifest, dùng chung promise cho tài nguyên,
  đợi CSS trước khi mount, cho thử lại khi tải lỗi. Đóng/chuyển game khi đang
  tải không dựng lại màn cũ. Script cổ điển giữ hỗ trợ `file://`.
- Artwork Cờ vua/Cờ tướng nằm trong `art.js` để thư viện không cần tải logic
  cờ. Bản 3D chỉ tải nhóm renderer cần thiết. Renderer xe đạp mới được giữ
  nguyên khi mở thêm game hành động, tránh bị renderer cũ ghi đè.
- Neon lưu dữ liệu có phiên bản và kiểm tra giới hạn, xác nhận xóa, báo lỗi
  lưu trữ. Không thay đổi số quái hoặc bỏ mô phỏng vật thể ngoài màn hình.
- Server production dùng ETag theo nội dung và `no-cache`: phản hồi `304`
  khi không đổi; file chưa có tên theo hash không được gắn `immutable`.
  Development giữ `no-store`. Chạy bằng `npm run start:production`.

Kiểm thử đã chạy:

- `npm test`: **345/345 đạt**, log `optimization/unit-tests.log`.
- `npm run test:cache`: **7/7 đạt**, gồm GET/HEAD, ETag, thay đổi cùng kích
  thước/timestamp, giới hạn đường dẫn và Caro WebSocket.
- Loader: **16 lượt đạt** trong `test-results/loader/results.json`; đủ
  28 game qua HTTP/file trên hai engine, retry JS/CSS, đóng/chuyển khi đang
  tải và link mời Caro. Thêm **3 lượt đạt** ở
  `optimization/loader-3d-final/`: 10 game 3D HTTP/file và thử lại tài nguyên
  3D bị lỗi trên Chromium.
- Neon: **12/12 tình huống tối ưu** và **10/10 lượt tích hợp** trên hai engine;
  gồm 672 truy vấn lưới so với quét toàn bộ cho mỗi engine, nhịp mô phỏng
  120/60/30/20/10 FPS, đóng ngay sau khi nhặt vàng, HTTP/file, 12 kiểu bản
  lưu lỗi, lưu trữ bị chặn, chất lượng đồ họa, cảm ứng, xoay màn hình và HUD.
  Báo cáo cuối: `optimization/neon-final-correctness/` và
  `optimization/neon-final-integration/`.
- Hồi quy UNO Chromium (9 nhóm chức năng), năm game bài/bàn Chromium (6
  lượt gồm mở bằng file), mô hình/điều khiển/tài nguyên xe đạp Chromium và
  WebKit (2 lượt). Báo cáo: `optimization/uno-regression/`,
  `optimization/table-regression/`, `optimization/race-regression-fixed/`.
- Hải chiến: **2/2 lượt chức năng đạt**, xác nhận helper tạo fixture vẫn hoạt
  động sau tải theo nhu cầu; `optimization/battleship-regression/`.
- Caro online: **2/2 lượt đạt**, Chromium 156.0.4314.42 và WebKit 26.0:
  hai browser context độc lập, mời phòng, giới hạn chỗ, đồng bộ nước đi,
  tải lại, mất/kết nối lại mạng, thắng, chơi tiếp đổi quân và rời phòng.
  Log: `optimization/online-chromium.log`, `optimization/online-webkit.log`.
- Kiểm tra cú pháp 18 file JavaScript liên quan và script nhúng Neon đạt;
  `git diff --check` trên các file thay đổi của đợt tối ưu đạt.

Các đường dẫn báo cáo tương đối trong phần này thuộc `test-results/`.
