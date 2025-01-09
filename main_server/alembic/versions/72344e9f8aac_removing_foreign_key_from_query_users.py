"""removing foreign key from Query_Users

Revision ID: 72344e9f8aac
Revises: aa7dc3bbd5a3
Create Date: 2025-01-09 16:09:40.908826

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72344e9f8aac'
down_revision: Union[str, None] = 'aa7dc3bbd5a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('query_users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_query_users_session_id', type_='foreignkey')
        batch_op.drop_constraint('fk_query_users_chatbot_id', type_='foreignkey')



def downgrade() -> None:
    with op.batch_alter_table('query_users', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_query_users_session_id', 'queries', ['session_id'], ['session_id'])
        batch_op.create_foreign_key('fk_query_users_chatbot_id', 'chatbots', ['chatbot_id'], ['chatbot_id'])
