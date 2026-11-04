<!-- version v1.0 -->
# Ma sói · Bạn và 7 máy

Một người chơi cùng 7 máy trên thiết bị hiện tại. Vào **Nhập vai → Ma sói**; mỗi ván chia lại 8 vai: 2 Ma sói, 1 Tiên tri, 1 Bảo vệ và 4 Dân làng. Đây là bản luật đơn giản dành cho chơi cục bộ, không có phòng online, chat người thật, tài khoản hoặc dịch vụ AI bên ngoài.

## Cách chơi

- Bắt đầu ở đêm 1. Nếu có năng lực, chọn một người trên bàn rồi nhấn **Xác nhận**. Dân làng nhấn **Qua đêm**.
- Sói biết sói đồng đội và tấn công một người phe làng. Nếu bạn là sói còn sống, lựa chọn của bạn là lựa chọn của cả bầy; khi chỉ máy điều khiển bầy, sói còn sống có số ghế nhỏ nhất quyết định.
- Tiên tri kiểm tra một người khác mỗi đêm: kết quả là **là sói / không phải sói**, chỉ hiện trong sổ tay riêng. Không biết vai cụ thể của người không phải sói.
- Bảo vệ chọn một người, được tự bảo vệ nhưng không được chọn cùng người hai đêm liên tiếp. Nếu bảo vệ trùng mục tiêu bị sói tấn công, không ai bị loại trong đêm. Làng không được biết mục tiêu đã được bảo vệ.
- Các năng lực đêm có hiệu lực đồng thời: Tiên tri vẫn nhận kết quả nếu bị loại trong chính đêm đó.
- Ban ngày đọc lời bàn của máy rồi chọn một người khác để bỏ phiếu. Máy có thể nghi sai hoặc đưa ra lời bàn có lợi cho phe sói; lời bàn không xác nhận vai trò.
- Trước khi bỏ phiếu, bạn có tối đa **2 lượt phát biểu mỗi ngày**: **Nghi ngờ**, **Bênh vực** hoặc **Nhận vai**. Phát biểu là tùy chọn, không tự bỏ phiếu hay chuyển pha. Cùng một ý không gửi lại trong ngày.
- Nghi ngờ/bênh vực: chọn một người còn sống và lý do. Cảm nhận cá nhân luôn có; lý do về phiếu hoặc lời mâu thuẫn chỉ xuất hiện khi đã có bằng chứng công khai. Mỗi phát biểu có tối đa hai máy trả lời; ý mới nhất của mỗi người ảnh hưởng đến lựa chọn máy.
- Nhận vai Dân làng/Tiên tri/Bảo vệ là **lời tự nhận chưa xác thực**. Khi nhận Tiên tri, có thể công bố một người là sói/không phải sói, hoặc chỉ nhận vai. Người thuộc vai khác cũng có thể nhận giả và công bố sai. Game không dùng vai bí mật để xác nhận lời nói; kết quả trong sổ tay Tiên tri vẫn riêng tư cho đến khi người chơi tự công bố.
- Tất cả người còn sống bỏ phiếu. Người có số phiếu cao nhất duy nhất bị loại. Nếu hòa ở số phiếu cao nhất, không loại ai và chuyển sang đêm mới. Không có bỏ phiếu trắng hoặc vòng bỏ phiếu lại.
- **Bảng phiếu** lưu từng ngày sau khi chốt: người bỏ phiếu, mục tiêu, số phiếu cao nhất và người bị loại hoặc hòa. Chọn ngày để xem lại; không hiện lựa chọn chưa chốt. Nhật ký cũng giữ các phát biểu và phản hồi.
- Vai của người bị loại được công khai; người bị loại không dùng năng lực hoặc bỏ phiếu nữa. Nếu bạn bị loại, các pha tiếp tục tự động để bạn theo dõi kết quả.
- Phe làng thắng ngay khi hết sói. Phe sói thắng ngay khi số sói còn sống bằng hoặc nhiều hơn số người phe làng còn sống. Nếu hết ngày 12 mà chưa bên nào thắng, ván hòa. Toàn bộ vai được công khai khi ván kết thúc.
- Điểm: 100 nếu phe của bạn thắng, kể cả bạn đã bị loại; 0 nếu thua hoặc hòa. Mỗi ván độc lập, không có cược hoặc tiền thật.

Cơ chế ngày/đêm, thảo luận, bỏ phiếu và Tiên tri tham khảo [mô tả chính thức Ultimate Werewolf của Bezier Games](https://beziergames.com/collections/hot-items/products/ultimate-werewolf-extreme). Thành phần 8 người, Bảo vệ, điều kiện thắng ở thế ngang số, công khai vai khi bị loại, quy tắc hòa phiếu và giới hạn 12 ngày là quy ước riêng của phiên bản này.

## Máy và thông tin bí mật

`botAction(snapshot, random)` chỉ nhận ảnh chụp thông tin đã lọc từ `view(state, player)`: vai của bản thân, đồng đội nếu là sói, vai đã công khai, kết quả kiểm tra riêng nếu là Tiên tri, lời bàn và phiếu của ngày trước. Máy không đọc vai đối phương còn sống từ trạng thái đầy đủ để bỏ phiếu.

Máy Tiên tri ưu tiên kiểm tra người chưa biết và bỏ phiếu sói đã phát hiện; khi phát hiện sói, máy có thể tự nhận Tiên tri và công bố kết quả trong lời bàn. Giao diện vẫn ghi đây là lời tự nhận, không tự lộ vai thật của máy. Sói tránh bỏ phiếu đồng đội. Các máy còn lại tham khảo lời bàn, lịch sử phiếu và lời nhận vai; chọn ngẫu nhiên giữa các ứng viên bằng điểm. Không có trò chuyện tự do hoặc suy luận bằng mô hình ngôn ngữ.

Lý do có thể nhắc một phiếu cho người đã lộ vai, lời nhận vai thay đổi, hai kết quả soi mâu thuẫn hoặc nhiều người nhận cùng một vai duy nhất. Phiếu sai và nhận vai trùng chỉ là dấu hiệu nghi ngờ. Lời công bố soi chỉ bị đối chiếu với sự thật khi mục tiêu bị loại và lộ vai. Một người lặp lời không được cộng dồn ảnh hưởng; phản hồi không được tính thành thêm phiếu nghi ngờ. Kiến thức soi riêng của máy và nhận biết đồng đội sói được ưu tiên hơn các lời chưa xác thực.

Giao diện chỉ dựng từ `view(state, 0)`; thẻ người chưa biết không chứa tên vai trong nội dung, thuộc tính hay nhãn trợ năng. Trạng thái đầy đủ vẫn ở bộ nhớ JavaScript của game cục bộ; đây không phải cơ chế chống gian lận trước người tự sửa mã hoặc mở công cụ lập trình.

## API và kiểm thử

- `ArcadeWerewolf.createGame({ random, maxDays })`: tạo ván, mặc định tối đa 12 ngày; hàm ngẫu nhiên có thể thay bằng bộ sinh có seed để tái hiện kiểm thử.
- Trạng thái gồm `players`, `phase` (`night`, `day`, `over`), `day`, `turn`, `actions`, `knowledge`, `guardLast`, `history`, `discussion`, `lastVotes`, `winner` (`village`, `wolves`, `draw`, hoặc `null`). `knowledge` và `actions` là thông tin riêng trên trạng thái gốc.
- `voteHistory` lưu các vòng phiếu đã chốt; `statements` lưu lời tự công bố theo ngày. `view` trả bản sao tách biệt của cả hai; lời công bố không kèm cờ xác thực bằng vai bí mật.
- `view(state, player=0)` trả bản sao an toàn cho một người, không chia sẻ tham chiếu có thể sửa ngược dữ liệu gốc.
- `actionType(view)`, `legalTargets(state, player)`, `act(state, player, {type, target})`: kiểm tra rồi ghi nhận hành động đúng pha, đúng vai, đúng mục tiêu; không được thay đổi lựa chọn sau khi xác nhận.
- `advance(state)`: yêu cầu người còn sống có năng lực xác nhận trước, bổ sung các hành động máy còn thiếu, giải quyết một pha, kiểm tra thắng và tạo thảo luận công khai của ngày mới.
- `botAction(view, random)`: chọn hành động chỉ bằng thông tin người chơi được biết.
- `speak(state, player, statement)`: ghi phát biểu đúng thời điểm và giới hạn; `kind` là `suspect`/`defend` với `target`, `reason`, hoặc `claim` với `role` và tùy chọn `target`, `verdict` boolean cho lời soi. Lệnh sai không đổi trạng thái.
- `speechReasons(view, kind, target)`, `speechesLeft(view)`, `evidence(view, target)`: lý do hợp lệ, lượt còn lại và dấu hiệu từ dữ liệu công khai, dùng chung giữa UI và luật.

Chạy `node --test tests/werewolf.test.cjs`. Bộ kiểm thử gồm chia vai, bảo mật góc nhìn, đồng đội sói, bảo vệ/không bảo vệ lặp, năng lực đồng thời, bỏ phiếu/hòa phiếu, điều kiện thắng, giới hạn ngày, người chơi đã bị loại và 300 ván hoàn chỉnh với seed khác nhau. Tạm dừng/đóng/chơi lại dùng vòng đời `ArcadeShared.createScope`; kiểm thử trình duyệt được tích hợp ở `tests/browser-table-games.cjs`.

Đợt cải tiến thêm 100 ván có phát biểu, kiểm tra thông tin kín, tác động lời nói và bảng phiếu. `tests/werewolf-3d.test.cjs` kiểm tra người bị loại không còn mô hình và có nhãn trạng thái. `tests/browser-werewolf.cjs` kiểm tra cả 2D/3D qua file:// tại 1280/390/320 px. Dùng `node tests/werewolf-harness.cjs unit|adapter|browser|serial|check <nhãn-mới>` để ghi bằng chứng có ngân sách. Xem [báo cáo xác minh](werewolf-verification.md).
