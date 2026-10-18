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
- Tất cả người còn sống bỏ phiếu. Người có số phiếu cao nhất duy nhất bị loại. Nếu hòa ở số phiếu cao nhất, không loại ai và chuyển sang đêm mới. Không có bỏ phiếu trắng hoặc vòng bỏ phiếu lại.
- Vai của người bị loại được công khai; người bị loại không dùng năng lực hoặc bỏ phiếu nữa. Nếu bạn bị loại, các pha tiếp tục tự động để bạn theo dõi kết quả.
- Phe làng thắng ngay khi hết sói. Phe sói thắng ngay khi số sói còn sống bằng hoặc nhiều hơn số người phe làng còn sống. Nếu hết ngày 12 mà chưa bên nào thắng, ván hòa. Toàn bộ vai được công khai khi ván kết thúc.
- Điểm: 100 nếu phe của bạn thắng, kể cả bạn đã bị loại; 0 nếu thua hoặc hòa. Mỗi ván độc lập, không có cược hoặc tiền thật.

Cơ chế ngày/đêm, thảo luận, bỏ phiếu và Tiên tri tham khảo [mô tả chính thức Ultimate Werewolf của Bezier Games](https://beziergames.com/collections/hot-items/products/ultimate-werewolf-extreme). Thành phần 8 người, Bảo vệ, điều kiện thắng ở thế ngang số, công khai vai khi bị loại, quy tắc hòa phiếu và giới hạn 12 ngày là quy ước riêng của phiên bản này.

## Máy và thông tin bí mật

`botAction(snapshot, random)` chỉ nhận ảnh chụp thông tin đã lọc từ `view(state, player)`: vai của bản thân, đồng đội nếu là sói, vai đã công khai, kết quả kiểm tra riêng nếu là Tiên tri, lời bàn và phiếu của ngày trước. Máy không đọc vai đối phương còn sống từ trạng thái đầy đủ để bỏ phiếu.

Máy Tiên tri ưu tiên kiểm tra người chưa biết và bỏ phiếu sói đã phát hiện. Sói tránh bỏ phiếu đồng đội. Các máy còn lại tham khảo lời bàn, phiếu đã công khai và chọn ngẫu nhiên giữa các ứng viên bằng điểm. Không có trò chuyện tự do hoặc suy luận bằng mô hình ngôn ngữ.

Giao diện chỉ dựng từ `view(state, 0)`; thẻ người chưa biết không chứa tên vai trong nội dung, thuộc tính hay nhãn trợ năng. Trạng thái đầy đủ vẫn ở bộ nhớ JavaScript của game cục bộ; đây không phải cơ chế chống gian lận trước người tự sửa mã hoặc mở công cụ lập trình.

## API và kiểm thử

- `ArcadeWerewolf.createGame({ random, maxDays })`: tạo ván, mặc định tối đa 12 ngày; hàm ngẫu nhiên có thể thay bằng bộ sinh có seed để tái hiện kiểm thử.
- Trạng thái gồm `players`, `phase` (`night`, `day`, `over`), `day`, `turn`, `actions`, `knowledge`, `guardLast`, `history`, `discussion`, `lastVotes`, `winner` (`village`, `wolves`, `draw`, hoặc `null`). `knowledge` và `actions` là thông tin riêng trên trạng thái gốc.
- `view(state, player=0)` trả bản sao an toàn cho một người, không chia sẻ tham chiếu có thể sửa ngược dữ liệu gốc.
- `actionType(view)`, `legalTargets(state, player)`, `act(state, player, {type, target})`: kiểm tra rồi ghi nhận hành động đúng pha, đúng vai, đúng mục tiêu; không được thay đổi lựa chọn sau khi xác nhận.
- `advance(state)`: yêu cầu người còn sống có năng lực xác nhận trước, bổ sung các hành động máy còn thiếu, giải quyết một pha, kiểm tra thắng và tạo thảo luận công khai của ngày mới.
- `botAction(view, random)`: chọn hành động chỉ bằng thông tin người chơi được biết.

Chạy `node --test tests/werewolf.test.cjs`. Bộ kiểm thử gồm chia vai, bảo mật góc nhìn, đồng đội sói, bảo vệ/không bảo vệ lặp, năng lực đồng thời, bỏ phiếu/hòa phiếu, điều kiện thắng, giới hạn ngày, người chơi đã bị loại và 300 ván hoàn chỉnh với seed khác nhau. Tạm dừng/đóng/chơi lại dùng vòng đời `ArcadeShared.createScope`; kiểm thử trình duyệt được tích hợp ở `tests/browser-table-games.cjs`.
